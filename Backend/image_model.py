import numpy as np
import cv2

class ImageModel:
    def __init__(self, file_stream=None, filename=None, compute_fft=True):
        self.filename = filename
        self.original_data = None
        self.original_shape = None
        self.fft_raw = None
        self.fft_shape = None
        
        # FIXED CONSTANT: Force all internal FFTs to this size for mixing compatibility
        self.FIXED_FFT_SIZE = (512, 512) 
        
        if file_stream:
            self._load_and_process(file_stream, compute_fft)

    def _load_and_process(self, file_stream, compute_fft=True):
        file_bytes = np.asarray(bytearray(file_stream.read()), dtype=np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from stream")
        if len(img.shape) == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        self.original_data = img
        self.original_shape = img.shape
        
        if compute_fft:
            self._compute_fft()

    def _compute_fft(self):
        """Compute FFT on fixed size grid"""
        if self.original_data is None: return
        
        # 1. Resize to FIXED (512x512) using LANCZOS
        resized = cv2.resize(
            self.original_data, 
            (self.FIXED_FFT_SIZE[1], self.FIXED_FFT_SIZE[0]),
            interpolation=cv2.INTER_LANCZOS4
        )
        self.fft_shape = resized.shape
        # 2. Compute FFT
        self.fft_raw = np.fft.fft2(resized.astype(np.float64))

    def get_component(self, type_name):
        """Get visual component (Log Magnitude, Phase, etc.) for UI"""
        if self.fft_raw is None: return None

        centered = np.fft.fftshift(self.fft_raw)
        out = None

        if type_name == 'Magnitude':
            mag = np.abs(centered)
            mag[mag == 0] = 1e-12
            out = 20 * np.log10(mag)
        elif type_name == 'Phase':
            out = np.angle(centered)
        elif type_name == 'Real':
            out = np.real(centered)
        elif type_name == 'Imaginary':
            out = np.imag(centered)
            
        if out is None: return None

        # Normalize to 0-255
        mn, mx = np.min(out), np.max(out)
        if np.isfinite(mn) and np.isfinite(mx) and mx != mn:
            out_norm = (out - mn) / (mx - mn)
            out_norm = (out_norm * 255.0).astype(np.uint8)
            return out_norm
        return np.zeros_like(out, dtype=np.uint8)

    def get_data_for_mixing(self, type_name):
        """Get RAW float data (Linear Magnitude/Phase) for mixing math"""
        if self.fft_raw is None: return None
        
        # Center for consistent masking/mixing
        centered = np.fft.fftshift(self.fft_raw)
        
        if type_name == 'Magnitude':
            return np.abs(centered) # Linear Magnitude
        elif type_name == 'Phase':
            return np.angle(centered)
        elif type_name == 'Real':
            return np.real(centered)
        elif type_name == 'Imaginary':
            return np.imag(centered)
        return None

    def custom_ifft_2d(self, freq_data_centered, progress_callback=None):
        """Reconstruct image from centered freq data and resize to original"""
        if freq_data_centered is None: return None
        
        # 1. Handle NaNs
        freq_data_centered = np.nan_to_num(freq_data_centered)
        
        if progress_callback: progress_callback(70)
        
        # 2. Unshift and IFFT
        f_uncentered = np.fft.ifftshift(freq_data_centered)
        spatial = np.real(np.fft.ifft2(f_uncentered))
        
        if progress_callback: progress_callback(90)
        
        # 3. Resize back to original aspect ratio
        if self.original_shape and spatial.shape != self.original_shape:
            spatial = cv2.resize(
                spatial, 
                (self.original_shape[1], self.original_shape[0]), 
                interpolation=cv2.INTER_LANCZOS4
            )
            
        return spatial