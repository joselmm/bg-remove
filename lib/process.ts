import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
  PreTrainedModel,
  Processor
} from "@huggingface/transformers";

// Initialize different model configurations
const WEBGPU_MODEL_ID = "Xenova/modnet";
const FALLBACK_MODEL_ID = "briaai/RMBG-1.4";

interface ModelState {
  model: PreTrainedModel | null;
  processor: Processor | null;
  isWebGPUSupported: boolean;
  currentModelId: string;
}

const state: ModelState = {
  model: null,
  processor: null,
  isWebGPUSupported: false,
  currentModelId: FALLBACK_MODEL_ID
};

// Initialize WebGPU with proper error handling
async function initializeWebGPU() {
  const gpu = (navigator as any).gpu;
  if (!gpu) {
    throw new Error("WebGPU is not supported in this browser");
  }

  try {
    // Configure environment for WebGPU
    env.allowLocalModels = false;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
    }

    // Wait for WebAssembly initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize model with WebGPU
    state.model = await AutoModel.from_pretrained(WEBGPU_MODEL_ID, {
      device: "webgpu",
      config: {
        model_type: 'modnet',
        architectures: ['MODNet']
      }
    });
    state.processor = await AutoProcessor.from_pretrained(WEBGPU_MODEL_ID);
    return true;
  } catch (error) {
    console.error("WebGPU initialization failed:", error);
    throw new Error("Failed to initialize WebGPU model. Falling back to cross-browser version.");
  }
}

// Initialize the model based on the selected model ID
export async function initializeModel(forceModelId?: string): Promise<boolean> {
  try {
    // Check for WebGPU support
    const gpu = (navigator as any).gpu;
    state.isWebGPUSupported = Boolean(gpu);
    
    // Determine which model to use
    const selectedModelId = forceModelId || FALLBACK_MODEL_ID;
    const useWebGPU = selectedModelId === WEBGPU_MODEL_ID && gpu;
    
    console.log(`Initializing model: ${selectedModelId} ${useWebGPU ? '(WebGPU)' : '(Cross-browser)'}`);
    
    if (useWebGPU) {
      await initializeWebGPU();
    } else {
      // Configure for cross-browser compatibility
      env.allowLocalModels = false;
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
    
    state.currentModelId = selectedModelId;
    return true;
  } catch (error) {
    console.error("Error initializing model:", error);
    // If WebGPU fails, automatically fall back to cross-browser version
    if (forceModelId === WEBGPU_MODEL_ID) {
      console.log("Falling back to cross-browser model...");
      return initializeModel(FALLBACK_MODEL_ID);
    }
    throw new Error(error instanceof Error ? error.message : "Failed to initialize background removal model");
  }
}

// Get current model info
export function getModelInfo() {
  return {
    currentModelId: state.currentModelId,
    isWebGPUSupported: state.isWebGPUSupported
  };
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

export async function processImages(images: File[]): Promise<File[]> {
  console.log("Processing images...");
  const processedFiles: File[] = [];
  
  for (const image of images) {
    try {
      const processedFile = await processImage(image);
      processedFiles.push(processedFile);
      console.log("Successfully processed image", image.name);
    } catch (error) {
      console.error("Error processing image", image.name, error);
    }
  }
  
  console.log("Processing images done");
  return processedFiles;
}
