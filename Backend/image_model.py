import numpy as np
import cv2

# ==========================================
# CLASS 1: THE DATA MODEL (State Holder)
# ==========================================
class ImageEntity:
    """
    Represents the state of a single image.
    Uses encapsulation with private attributes and public getters/setters.
    """
    def __init__(self, filename=None):
        self._filename = filename
        self._original_data = None
        self._original_shape = None
        self._fft_raw = None
        self._fft_shape = None

    @property
    def filename(self):
        return self._filename

    @filename.setter
    def filename(self, value):
        self._filename = value

    @property
    def original_data(self):
        return self._original_data

    @original_data.setter
    def original_data(self, value):
        self._original_data = value
        if value is not None:
            self._original_shape = value.shape

    @property
    def original_shape(self):
        return self._original_shape

    @property
    def fft_raw(self):
        return self._fft_raw

    @fft_raw.setter
    def fft_raw(self, value):
        self._fft_raw = value

    @property
    def fft_shape(self):
        return self._fft_shape

    @fft_shape.setter
    def fft_shape(self, value):
        self._fft_shape = value


# ==========================================
# CLASS 2: THE MANAGER (Logic/Operations)
# ==========================================
class ImageManager:
    """
    Handles logic: Loading, Processing, FFT calculations, and Reconstruction.
    Operates on ImageEntity objects.
    """
    def __init__(self, fixed_fft_size=(512, 512)):
        self.FIXED_FFT_SIZE = fixed_fft_size

    def load_from_stream(self, image_entity: ImageEntity, file_stream):
        """
        Reads bytes from stream, processes to grayscale, and saves to entity.
        Does NOT compute FFT (use compute_fft for that).
        """
        if not file_stream:
            raise ValueError("Empty file stream")

        # Read and Decode
        file_bytes = np.asarray(bytearray(file_stream.read()), dtype=np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode image from stream")

        # Convert to Grayscale if needed
        if len(img.shape) == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Store in the Entity (Setter handles shape update)
        image_entity.original_data = img

    def compute_fft(self, image_entity: ImageEntity):
        """Compute FFT on fixed size grid and store in entity"""
        if image_entity.original_data is None:
            return

        # 1. Resize to FIXED size using LANCZOS
        resized = cv2.resize(
            image_entity.original_data,
            (self.FIXED_FFT_SIZE[1], self.FIXED_FFT_SIZE[0]),
            interpolation=cv2.INTER_LANCZOS4
        )

        # 2. Update Entity
        image_entity.fft_shape = resized.shape
        image_entity.fft_raw = np.fft.fft2(resized.astype(np.float64))

    def get_component_view(self, image_entity: ImageEntity, type_name):
        """Get visual component (Log Magnitude, Phase, etc.) formatted for UI (uint8)"""
        if image_entity.fft_raw is None:
            return None

        centered = np.fft.fftshift(image_entity.fft_raw)
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

        if out is None:
            return None

        # Normalize to 0-255
        mn, mx = np.min(out), np.max(out)
        if np.isfinite(mn) and np.isfinite(mx) and mx != mn:
            out_norm = (out - mn) / (mx - mn)
            out_norm = (out_norm * 255.0).astype(np.uint8)
            return out_norm

        return np.zeros_like(out, dtype=np.uint8)

    def get_mixing_data(self, image_entity: ImageEntity, type_name):
        """Get RAW float data (Linear Magnitude/Phase) for mixing math"""
        if image_entity.fft_raw is None:
            return None

        centered = np.fft.fftshift(image_entity.fft_raw)

        if type_name == 'Magnitude':
            return np.abs(centered)
        elif type_name == 'Phase':
            return np.angle(centered)
        elif type_name == 'Real':
            return np.real(centered)
        elif type_name == 'Imaginary':
            return np.imag(centered)
        return None

    def reconstruct_image(self, image_entity: ImageEntity, freq_data_centered, progress_callback=None):
        """
        Reconstruct image from centered freq data and resize to 
        the ORIGINAL shape stored in the image_entity (ref_entity).
        """
        if freq_data_centered is None:
            return None

        freq_data_centered = np.nan_to_num(freq_data_centered)

        if progress_callback: progress_callback(70)

        # Unshift and IFFT
        f_uncentered = np.fft.ifftshift(freq_data_centered)
        spatial = np.real(np.fft.ifft2(f_uncentered))

        if progress_callback: progress_callback(90)

        # Resize back to original aspect ratio of the reference entity
        original_shape = image_entity.original_shape
        if original_shape and spatial.shape != original_shape:
            spatial = cv2.resize(
                spatial,
                (original_shape[1], original_shape[0]), # cv2 uses (width, height)
                interpolation=cv2.INTER_LANCZOS4
            )

        return spatial