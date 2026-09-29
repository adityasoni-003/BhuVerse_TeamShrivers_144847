import io
from typing import Tuple, Union
from PIL import Image, UnidentifiedImageError
import numpy as np

class ImageProcessingError(Exception):
    """Base exception for image preprocessing errors."""
    pass

class UnsupportedImageFormatError(ImageProcessingError):
    """Raised when uploaded file is not a supported image format."""
    pass

class CorruptImageError(ImageProcessingError):
    """Raised when image file is corrupted or unreadable."""
    pass

class ImagePreprocessor:
    """
    Image Preprocessing Layer for BhuVerse AI Pipeline.
    Handles image format validation, corruption checks, RGB conversion, and standard model resizing.
    Preserves original uploaded files without modification.
    """

    ALLOWED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP", "TIFF", "BMP"}

    @classmethod
    def validate_and_load(cls, file_source: Union[str, bytes, io.BytesIO]) -> Image.Image:
        """
        Validates file integrity and format, returning an uncorrupted PIL Image.
        """
        try:
            if isinstance(file_source, str):
                img = Image.open(file_source)
            elif isinstance(file_source, bytes):
                img = Image.open(io.BytesIO(file_source))
            elif isinstance(file_source, io.BytesIO):
                img = Image.open(file_source)
            else:
                raise ImageProcessingError(f"Unsupported input source type: {type(file_source)}")

            img.verify() # Verify file integrity

            # Re-open after verify() because verify() closes the stream or leaves it unusable
            if isinstance(file_source, str):
                img = Image.open(file_source)
            elif isinstance(file_source, bytes):
                img = Image.open(io.BytesIO(file_source))
            elif isinstance(file_source, io.BytesIO):
                file_source.seek(0)
                img = Image.open(file_source)

            # Load image data into memory
            img.load()

            format_name = (img.format or "").upper()
            if format_name and format_name not in cls.ALLOWED_FORMATS:
                raise UnsupportedImageFormatError(
                    f"Unsupported image format: '{format_name}'. Allowed: {', '.join(cls.ALLOWED_FORMATS)}"
                )

            return img

        except UnidentifiedImageError as e:
            raise UnsupportedImageFormatError(f"File cannot be identified as a valid image: {e}")
        except (IOError, SyntaxError) as e:
            raise CorruptImageError(f"Image is corrupted or incomplete: {e}")
        except Exception as e:
            if isinstance(e, ImageProcessingError):
                raise
            raise CorruptImageError(f"Failed to process image: {str(e)}")

    @classmethod
    def preprocess_for_inference(
        cls, 
        image: Image.Image, 
        target_size: Tuple[int, int] = (640, 640)
    ) -> Image.Image:
        """
        Prepares a copy of the image for model inference:
        - Converts to RGB color mode
        - Resizes to standard model dimension (e.g. 640x640)
        """
        # Convert color mode
        if image.mode != "RGB":
            processed = image.convert("RGB")
        else:
            processed = image.copy()

        # Resize for standard model resolution
        if target_size and processed.size != target_size:
            processed = processed.resize(target_size, Image.Resampling.BILINEAR)

        return processed

    @classmethod
    def normalize_array(cls, image: Image.Image) -> np.ndarray:
        """
        Converts PIL Image to normalized float32 numpy array [0.0, 1.0].
        """
        arr = np.array(image, dtype=np.float32)
        return arr / 255.0
