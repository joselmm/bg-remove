import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
  PreTrainedModel,
  Processor
} from "@huggingface/transformers";
import { db } from '../src/db';

// Initialize different model configurations
const WEBGPU_MODEL_ID = "Xenova/modnet";
const FALLBACK_MODEL_ID = "briaai/RMBG-1.4";

interface ModelState {
  model: PreTrainedModel | null;
  processor: Processor | null;
  isWebGPUSupported: boolean;
}

const state: ModelState = {
  model: null,
  processor: null,
  isWebGPUSupported: false
};

// Initialize the appropriate model based on WebGPU support
export async function initializeModel(): Promise<boolean> {
  try {
    // Check for WebGPU support
    const gpu = (navigator as any).gpu;
    
    // Configure environment before model initialization
    env.allowLocalModels = false;
    
    if (gpu) {
      console.log("WebGPU is supported, initializing WebGPU version...");
      // WebGPU-specific configuration
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = false;
      }
      state.model = await AutoModel.from_pretrained(WEBGPU_MODEL_ID, {
        device: "webgpu"
      });
      state.processor = await AutoProcessor.from_pretrained(WEBGPU_MODEL_ID);
      state.isWebGPUSupported = true;
    } else {
      console.log("WebGPU not supported, using cross-browser compatible version...");
      // Configure ONNX backend for cross-browser compatibility
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = true;
      }
      
      // Initialize model with proper configuration for cross-browser support
      state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
        progress_callback: (progress) => {
          console.log(`Loading model: ${Math.round(progress * 100)}%`);
        }
      });
      
      // Initialize processor with specific configuration for RMBG-1.4
      state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
        revision: "main",
        config: {
          do_normalize: true,
          do_pad: true,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: "ImageFeatureExtractor",
          image_std: [0.5, 0.5, 0.5],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 }
        }
      });
    }
    
    // Verify model and processor initialization
    if (!state.model || !state.processor) {
      throw new Error("Failed to initialize model or processor");
    }
    
    return true;
  } catch (error) {
    console.error("Error initializing model:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to initialize background removal model");
  }
}

export async function processImage(image: File): Promise<File> {
  if (!state.model || !state.processor) {
    throw new Error("Model not initialized. Call initializeModel() first.");
  }

  const img = await RawImage.fromURL(URL.createObjectURL(image));
  
  try {
    // Pre-process image
    const { pixel_values } = await state.processor(img);
    
    // Predict alpha matte
    const { output } = await state.model({ input: pixel_values });

    // Resize mask back to original size
    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        img.width,
        img.height,
      )
    ).data;

    // Create new canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if(!ctx) throw new Error("Could not get 2d context");
    
    // Draw original image output to canvas
    ctx.drawImage(img.toCanvas(), 0, 0);

    // Update alpha channel
    const pixelData = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < maskData.length; ++i) {
      pixelData.data[4 * i + 3] = maskData[i];
    }
    ctx.putImageData(pixelData, 0, 0);
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => 
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Failed to create blob")), 
        "image/png"
      )
    );
    
    const [fileName] = image.name.split(".");
    const processedFile = new File([blob], `${fileName}-bg-blasted.png`, { type: "image/png" });
    return processedFile;
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to process image");
  }
}

export async function processImages() {
  console.log("Processing images...");
  
  // Get all images that haven't been processed yet
  const imagesToProcess = await db.images
    .filter(image => !image.processedFile)
    .reverse()
    .toArray();

  console.log("Images to process:", imagesToProcess.length);
  
  for (const image of imagesToProcess) {
    console.log("Processing image", image.id);
    try {
      const processedFile = await processImage(image.file);
      await db.images.update(image.id, { processedFile });
      console.log("Successfully processed image", image.id);
    } catch (error) {
      console.error("Error processing image", image.id, error);
    }
  }
  
  console.log("Processing images done");
}
