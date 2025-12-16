from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from image_model import ImageModel
import numpy as np
import cv2
import base64
import threading
import queue
import time

app = Flask(__name__)
CORS(app)

# Global State
images = { '1': None, '2': None, '3': None, '4': None }
current_task = { 'id': 0, 'progress': 0, 'result': None, 'status': 'idle' }
task_lock = threading.Lock()

# FFT Worker
fft_queue = queue.Queue()
fft_thread_running = True

def fft_worker():
    print("FFT Worker started")
    while fft_thread_running:
        try:
            item = fft_queue.get(timeout=1)
            if item is None: break
            slot_id, img_obj = item
            try:
                img_obj._compute_fft()
                print(f"FFT computed for slot {slot_id}")
            except Exception as e:
                print(f"FFT Error slot {slot_id}: {e}")
            fft_queue.task_done()
        except queue.Empty:
            continue

worker_thread = threading.Thread(target=fft_worker, daemon=True)
worker_thread.start()

# Helper
def array_to_base64(arr):
    norm = cv2.normalize(arr, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    _, buf = cv2.imencode('.png', norm)
    return base64.b64encode(buf).decode('utf-8')

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload/<slot_id>', methods=['POST'])
def upload(slot_id):
    file = request.files['image']
    img = ImageModel(file_stream=file, filename=file.filename, compute_fft=False)
    images[slot_id] = img
    fft_queue.put((slot_id, img))
    return jsonify({'status': 'success', 'dims': img.original_shape})

@app.route('/get_view/<slot_id>/<component>')
def get_view(slot_id, component):
    img = images.get(slot_id)
    if not img: return jsonify({'error': 'No image'}), 404
    for _ in range(20): 
        if img.fft_raw is not None: break
        time.sleep(0.1)
    data = img.get_component(component)
    if data is None: return jsonify({'error': 'Processing'}), 202
    return jsonify({'image': array_to_base64(data)})

# --- MODIFIED MIXING LOGIC ---
def run_mixing_task(task_id, req):
    global current_task
    
    def set_prog(p, status="running"):
        with task_lock:
            if current_task['id'] == task_id:
                current_task['progress'] = p
                current_task['status'] = status

    try:
        set_prog(5)
        
        valid_keys = [k for k, v in images.items() if v is not None and v.fft_raw is not None]
        if not valid_keys:
            raise ValueError("No images ready for mixing")

        # Extract weights
        w_mag = req.get('mag_weights', {})
        w_phase = req.get('phase_weights', {})
        w_real = req.get('real_weights', {})
        w_imag = req.get('imag_weights', {})
        
        region = req.get('region', {})
        mix_mode = req.get('mix_mode', 'mag_phase')

        set_prog(15)
        
        base_h, base_w = 512, 512
        
        # --- MIXING LOGIC ---
        ft_mix = None
        
        if mix_mode == 'mag_phase':
            final_mag = np.zeros((base_h, base_w), dtype=np.float64)
            final_phase = np.zeros((base_h, base_w), dtype=np.float64)

            for k in valid_keys:
                img = images[k]
                wm = float(w_mag.get(k, 0)) / 100.0
                wp = float(w_phase.get(k, 0)) / 100.0
                
                if wm > 0:
                    final_mag += wm * img.get_data_for_mixing('Magnitude')
                if wp > 0:
                    final_phase += wp * img.get_data_for_mixing('Phase')
            
            ft_mix = final_mag * np.exp(1j * final_phase)
            
        elif mix_mode == 'real_imag':
            final_real = np.zeros((base_h, base_w), dtype=np.float64)
            final_imag = np.zeros((base_h, base_w), dtype=np.float64)
            
            for k in valid_keys:
                img = images[k]
                wr = float(w_real.get(k, 0)) / 100.0
                wi = float(w_imag.get(k, 0)) / 100.0
                
                if wr > 0:
                    final_real += wr * img.get_data_for_mixing('Real')
                if wi > 0:
                    final_imag += wi * img.get_data_for_mixing('Imaginary')
            
            ft_mix = final_real + 1j * final_imag
        
        set_prog(50)

        # --- RECTANGULAR MASKING ---
        mask = np.zeros((base_h, base_w), dtype=np.float64)
        
        # Region params (0-100)
        r_w = int(region.get('width', 20))
        r_h = int(region.get('height', 20))
        r_x = int(region.get('x', 50))  # Center X
        r_y = int(region.get('y', 50))  # Center Y
        r_type = region.get('type', 'inner')
        
        # Convert to pixels
        rect_w_px = int(base_w * (r_w / 100.0))
        rect_h_px = int(base_h * (r_h / 100.0))
        cx = int(base_w * (r_x / 100.0))
        cy = int(base_h * (r_y / 100.0))
        
        # Calculate boundaries (Clip to image size)
        start_y = max(0, cy - rect_h_px // 2)
        end_y = min(base_h, cy + rect_h_px // 2)
        start_x = max(0, cx - rect_w_px // 2)
        end_x = min(base_w, cx + rect_w_px // 2)
        
        if r_type == 'inner':
            mask[start_y:end_y, start_x:end_x] = 1
        else:
            mask[:] = 1
            mask[start_y:end_y, start_x:end_x] = 0

        # Apply mask
        ft_mix *= mask
        
        set_prog(60)

        ref_img = images[valid_keys[0]]
        
        def ifft_cb(p): set_prog(60 + int(p * 0.3))
        result = ref_img.custom_ifft_2d(ft_mix, ifft_cb)
        
        res_b64 = array_to_base64(result)
        
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

@app.route('/start_mix', methods=['POST'])
def start_mix():
    with task_lock:
        current_task['id'] += 1
        current_task['status'] = 'running'
        tid = current_task['id']
    threading.Thread(target=run_mixing_task, args=(tid, request.json)).start()
    return jsonify({'task_id': tid})

@app.route('/progress')
def progress():
    with task_lock: return jsonify(current_task)

if __name__ == '__main__':
    app.run(debug=True, port=5000)