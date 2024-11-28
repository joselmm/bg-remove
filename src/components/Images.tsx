import React, { useState, useEffect } from "react";
import type { ImageFile } from "../App";

interface ImagesProps {
  images: ImageFile[];
  onDelete: (id: number) => void;
}

export function Images({ images, onDelete }: ImagesProps) {
  return (
    <div>
      <h2>Images: {images.length}</h2>
      <div className="gap-2 grid grid-cols-4">
        {images.map((image) => {
          if(image.file.type.includes("video")) {
            return <Video video={image} key={image.id} />;
          } else {
            return <ImageSpot image={image} onDelete={onDelete} key={image.id} />;
          }
        })}
      </div>
    </div>
  );
}

function Video({ video }: { video: ImageFile }) {
  const url = URL.createObjectURL(video.file);
  return (
    <div className="">
      <video
        className="rounded-lg aspect-square object-cover"
        loop
        muted
        autoPlay
        src={url}
      ></video>
    </div>
  );
}

interface ImageSpotProps {
  image: ImageFile;
  onDelete: (id: number) => void;
}

function ImageSpot({ image, onDelete }: ImageSpotProps) {
  const [bgColor, setBgColor] = useState("#ffffff");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [exportUrl, setExportUrl] = useState("");

  const url = URL.createObjectURL(image.file);
  const processedURL = image.processedFile ? URL.createObjectURL(image.processedFile) : "";
  const isProcessing = !image.processedFile;

  const createColorBackground = async () => {
    if (!image.processedFile) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    
    img.src = processedURL;
    await new Promise(resolve => img.onload = resolve);
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the processed image
    ctx.drawImage(img, 0, 0);
    
    // Create URL for download
    const dataUrl = canvas.toDataURL('image/png');
    setExportUrl(dataUrl);
  };

  useEffect(() => {
    if (image.processedFile) {
      createColorBackground();
    }
  }, [bgColor, image.processedFile]);

  return (
    <div>
      <div className="relative rounded-lg overflow-hidden">
        {isProcessing ? (
          <div className="relative">
            <img
              className="rounded-lg w-full aspect-square object-cover opacity-50 transition-opacity duration-200"
              src={url}
              alt={`Processing image ${image.id}`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span className="text-white font-medium">Processing...</span>
              </div>
            </div>
          </div>
        ) : (
          <img
            className="rounded-lg w-full aspect-square object-cover transition-opacity duration-200"
            style={{ backgroundColor: bgColor }}
            src={processedURL}
            alt={`Processed image ${image.id}`}
          />
        )}
      </div>
      <div className="controls mt-2 flex gap-2 items-center">
        <button 
          onClick={() => onDelete(image.id)}
          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
        {!isProcessing && (
          <>
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Background Color
              </button>
              {showColorPicker && (
                <div className="absolute mt-2 z-10">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 cursor-pointer"
                  />
                </div>
              )}
            </div>
            {exportUrl && (
              <a
                href={exportUrl}
                download={`colored-bg-${image.id}.png`}
                className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Download with Color
              </a>
            )}
            <a 
              href={processedURL} 
              download={`transparent-bg-${image.id}.png`}
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Download Original
            </a>
          </>
        )}
      </div>
    </div>
  );
}
