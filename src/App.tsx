import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Images } from "./components/Images";
import { processImages, initializeModel, getModelInfo } from "../lib/process";

interface AppError {
  message: string;
}

export interface ImageFile {
  id: number;
  file: File;
  processedFile?: File;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isWebGPU, setIsWebGPU] = useState(false);
  const [currentModel, setCurrentModel] = useState<'briaai/RMBG-1.4' | 'Xenova/modnet'>('briaai/RMBG-1.4');
  const [isModelSwitching, setIsModelSwitching] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const initialized = await initializeModel();
        if (!initialized) {
          throw new Error("Failed to initialize background removal model");
        }
        const { isWebGPUSupported } = getModelInfo();
        setIsWebGPU(isWebGPUSupported);
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : "An unknown error occurred"
        });
      }
      setIsLoading(false);
    })();
  }, []);

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value as typeof currentModel;
    setIsModelSwitching(true);
    setError(null);
    try {
      const initialized = await initializeModel(newModel);
      if (!initialized) {
        throw new Error("Failed to initialize new model");
      }
      setCurrentModel(newModel);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Falling back")) {
        setCurrentModel('briaai/RMBG-1.4');
      } else {
        setError({
          message: err instanceof Error ? err.message : "Failed to switch models"
        });
      }
    } finally {
      setIsModelSwitching(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      processedFile: undefined
    }));
    setImages(prev => [...prev, ...newImages]);
    
    // Process the new images
    for (const image of newImages) {
      try {
        const result = await processImages([image.file]);
        if (result && result.length > 0) {
          setImages(prev => prev.map(img => 
            img.id === image.id 
              ? { ...img, processedFile: result[0] }
              : img
          ));
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".mp4"],
    },
  });

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl mb-2">ERROR</h2>
          <p className="text-xl max-w-[500px] mb-4">{error.message}</p>
          {currentModel === 'Xenova/modnet' && (
            <button
              onClick={() => handleModelChange({ target: { value: 'briaai/RMBG-1.4' }} as any)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Switch to Cross-browser Version
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading || isModelSwitching) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
          <p className="text-lg">
            {isModelSwitching ? 'Switching models...' : 'Loading background removal model...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center">
          Remove Background
        </h1>

        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center gap-4">
            <span>Model:</span>
            <select
              value={currentModel}
              onChange={handleModelChange}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
              disabled={!isWebGPU}
            >
              <option value="briaai/RMBG-1.4">RMBG-1.4 (Cross-browser)</option>
              {isWebGPU && (
                <option value="Xenova/modnet">MODNet (WebGPU)</option>
              )}
            </select>
          </div>
          {!isWebGPU && (
            <p className="text-sm text-gray-400 mt-2">
              WebGPU is not supported in your browser. Using cross-browser compatible model.
            </p>
          )}
        </div>

        <h2 className="text-lg font-semibold mb-2 text-center">
          In-browser background removal, powered by{" "}
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/xenova/transformers.js"
          >
            🤗 Transformers.js
          </a>
        </h2>
        <div className="flex justify-center mb-8 gap-8">
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/huggingface/transformers.js-examples/blob/main/LICENSE"
          >
            License (Apache 2.0)
          </a>
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href={currentModel === 'Xenova/modnet' ? 
              "https://huggingface.co/Xenova/modnet" : 
              "https://huggingface.co/briaai/RMBG-1.4"
            }
          >
            Model ({currentModel === 'Xenova/modnet' ? 'MODNet' : 'RMBG-1.4'})
          </a>
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/huggingface/transformers.js-examples"
          >
            Code (GitHub)
          </a>
        </div>
        <div
          {...getRootProps()}
          className={`p-8 mb-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300 ease-in-out
            ${isDragAccept ? "border-green-500 bg-green-900/20" : ""}
            ${isDragReject ? "border-red-500 bg-red-900/20" : ""}
            ${isDragActive ? "border-blue-500 bg-blue-900/20" : "border-gray-700 hover:border-blue-500 hover:bg-blue-900/10"}
          `}
        >
          <input {...getInputProps()} className="hidden" />
          <p className="text-lg mb-2">
            {isDragActive
              ? "Drop the images here..."
              : "Drag and drop some images here"}
          </p>
          <p className="text-sm text-gray-400">or click to select files</p>
        </div>

        <Images images={images} onDelete={(id) => setImages(prev => prev.filter(img => img.id !== id))} />
      </div>
    </div>
  );
}
