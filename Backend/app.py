from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from image_model import ImageEntity, ImageManager
import numpy as np
import cv2
import base64
import threading
import queue
import time

app = Flask(__name__)
CORS(app)

# ==========================================
# GLOBAL STATE & MANAGER
# ==========================================
image_manager = ImageManager()  # Logic Handler
images = { '1': None, '2': None, '3': None, '4': None }  # Data Store (Entities)
current_task = { 'id': 0, 'progress': 0, 'result': None, 'status': 'idle', 'error': None }
task_lock = threading.Lock()

# ==========================================
# WORKER THREAD (FFT PROCESSING)
# ==========================================
fft_queue = queue.Queue()
fft_thread_running = True

def fft_worker():
    print("FFT Worker started")
    while fft_thread_running:
        try:
            item = fft_queue.get(timeout=1)
            if item is None: break
            
            slot_id, img_entity = item
            try:
                # Use Manager to compute FFT
                image_manager.compute_fft(img_entity)
                print(f"FFT computed for slot {slot_id}")
            except Exception as e:
                print(f"FFT Error slot {slot_id}: {e}")
            
            fft_queue.task_done()
        except queue.Empty:
            continue

worker_thread = threading.Thread(target=fft_worker, daemon=True)
worker_thread.start()

# ==========================================
# HELPERS
# ==========================================
def array_to_base64(arr):
    """Convert numpy array to base64 string for frontend display"""
    norm = cv2.normalize(arr, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    _, buf = cv2.imencode('.png', norm)
    return base64.b64encode(buf).decode('utf-8')

# ==========================================
# CORE MIXING LOGIC
# ==========================================
def run_mixing_task(task_id, req):
    """
    Executed in a background thread.
    Calculates Mag/Phase layer AND Real/Imag layer, adds them, masks them,
    and reconstructs the result.
    """
    global current_task
    
    def set_prog(p, status="running"):
        with task_lock:
            if current_task['id'] == task_id:
                current_task['progress'] = p
                current_task['status'] = status

    try:
        set_prog(5)
        
        # 1. Validation: Filter valid images
        valid_keys = [k for k, v in images.items() if v is not None and v.fft_raw is not None]
        if not valid_keys:
            raise ValueError("No processed images ready for mixing")

        # 2. Parse Incoming Weights
        w_mag = req.get('mag_weights', {})
        w_phase = req.get('phase_weights', {})
        w_real = req.get('real_weights', {})
        w_imag = req.get('imag_weights', {})
        region = req.get('region', {})

        set_prog(10)
        
        base_h, base_w = image_manager.FIXED_FFT_SIZE
        
        # Initialize the Accumulator (Complex 128) for ADDITIVE mixing
        ft_mix_total = np.zeros((base_h, base_w), dtype=np.complex128)
        
        # --- LAYER 1: MAGNITUDE & PHASE ---
        # Check if any mag/phase weights are active to save comp time
        has_mag_phase = any(float(w_mag.get(k, 0)) > 0 or float(w_phase.get(k, 0)) > 0 for k in valid_keys)
        
        if has_mag_phase:
            final_mag = np.zeros((base_h, base_w), dtype=np.float64)
            final_phase = np.zeros((base_h, base_w), dtype=np.float64)

            for k in valid_keys:
                img = images[k]
                wm = float(w_mag.get(k, 0)) / 100.0
                wp = float(w_phase.get(k, 0)) / 100.0
                
                if wm > 0:
                    final_mag += wm * image_manager.get_mixing_data(img, 'Magnitude')
                if wp > 0:
                    final_phase += wp * image_manager.get_mixing_data(img, 'Phase')
            
            # Combine to complex and ADD to total
            ft_mix_total += final_mag * np.exp(1j * final_phase)

        set_prog(30)

        # --- LAYER 2: REAL & IMAGINARY ---
        has_real_imag = any(float(w_real.get(k, 0)) > 0 or float(w_imag.get(k, 0)) > 0 for k in valid_keys)
        
        if has_real_imag:
            final_real = np.zeros((base_h, base_w), dtype=np.float64)
            final_imag = np.zeros((base_h, base_w), dtype=np.float64)
            
            for k in valid_keys:
                img = images[k]
                wr = float(w_real.get(k, 0)) / 100.0
                wi = float(w_imag.get(k, 0)) / 100.0
                
                if wr > 0:
                    final_real += wr * image_manager.get_mixing_data(img, 'Real')
                if wi > 0:
                    final_imag += wi * image_manager.get_mixing_data(img, 'Imaginary')
            
            # Combine to complex and ADD to total
            ft_mix_total += (final_real + 1j * final_imag)

        set_prog(50)

        # --- 3. REGION MASKING ---
        if region:
            mask = np.zeros((base_h, base_w), dtype=np.float64)
            
            # Region params (0-100)
            r_w = float(region.get('width', 100))
            r_h = float(region.get('height', 100))
            r_x = float(region.get('x', 50))
            r_y = float(region.get('y', 50))
            r_type = region.get('type', 'inner')
            
            # Convert % to pixels
            rect_w_px = int(base_w * (r_w / 100.0))
            rect_h_px = int(base_h * (r_h / 100.0))
            cx = int(base_w * (r_x / 100.0))
            cy = int(base_h * (r_y / 100.0))
            
            # Calculate boundaries
            start_y = max(0, cy - rect_h_px // 2)
            end_y = min(base_h, cy + rect_h_px // 2)
            start_x = max(0, cx - rect_w_px // 2)
            end_x = min(base_w, cx + rect_w_px // 2)
            
            if r_type == 'inner':
                mask[start_y:end_y, start_x:end_x] = 1
            else:
                mask[:] = 1
                mask[start_y:end_y, start_x:end_x] = 0

            # Apply mask to the TOTAL accumulated result
            ft_mix_total *= mask
        
        set_prog(60)

        # --- 4. RECONSTRUCTION ---
        # Use first valid image as reference for original size reconstruction
        ref_entity = images[valid_keys[0]]
        
        def ifft_cb(p): 
            set_prog(60 + int(p * 0.3))
            
        result = image_manager.reconstruct_image(ref_entity, ft_mix_total, ifft_cb)
        res_b64 = array_to_base64(result)
        
        # --- 5. FINALIZE ---
        with task_lock:
            if current_task['id'] == task_id:
                current_task['result'] = res_b64
                current_task['progress'] = 100
                current_task['status'] = 'completed'

    except Exception as e:
        print(f"Mixing Error: {e}")
        with task_lock:
            if current_task['id'] == task_id:
                current_task['status'] = 'error'
                current_task['error'] = str(e)

# ==========================================
# HTTP ROUTES
# ==========================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload/<slot_id>', methods=['POST'])
def upload(slot_id):
    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # 1. Create Data Entity
        img_entity = ImageEntity(filename=file.filename)
        
        # 2. Use Manager to load data (Synchronous part)
        image_manager.load_from_stream(img_entity, file)
        
        # 3. Store Entity
        images[slot_id] = img_entity
        
        # 4. Offload FFT to Worker (Asynchronous part)
        fft_queue.put((slot_id, img_entity))
        
        return jsonify({'status': 'success', 'dims': img_entity.original_shape})
        
    except Exception as e:
        print(f"Upload Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_view/<slot_id>/<component>')
def get_view(slot_id, component):
    img_entity = images.get(slot_id)
    if not img_entity: 
        return jsonify({'error': 'No image'}), 404
    
    # Wait briefly if FFT is still computing
    for _ in range(20): 
        if img_entity.fft_raw is not None: break
        time.sleep(0.05)
        
    # Use Manager to get UI component
    data = image_manager.get_component_view(img_entity, component)
    
    if data is None: 
        return jsonify({'error': 'Processing'}), 202
        
    return jsonify({'image': array_to_base64(data)})

@app.route('/start_mix', methods=['POST'])
def start_mix():
    with task_lock:
        current_task['id'] += 1
        current_task['status'] = 'running'
        current_task['progress'] = 0
        current_task['result'] = None
        current_task['error'] = None
        tid = current_task['id']
        
    threading.Thread(target=run_mixing_task, args=(tid, request.json)).start()
    return jsonify({'task_id': tid})

@app.route('/progress')
def progress():
    with task_lock: 
        return jsonify(current_task)

if __name__ == '__main__':
    app.run(debug=True, port=5000)