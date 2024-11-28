import React, { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Image } from "../db";

export function Images() {
  const images = useLiveQuery(() => db.images.reverse().toArray());

  return (
    <div>
      <h2>Images: {images?.length}</h2>
      <div className="gap-2 grid grid-cols-4">
        {images?.map((image) => {
          if(image.file.type.includes("video")) {
            return <Video video={image} key={image.id} />;
          } else {
            return <ImageSpot image={image} key={image.id} />;
          }
        })}
      </div>
    </div>
  );
}

function Video({ video }: { video: Image }) {
  const imageProcessed = video.processedFile instanceof File;
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

function ImageSpot({ image }: { image: Image }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportUrl, setExportUrl] = useState("");

  const imageProcessed = image.processedFile instanceof File;
  const url = URL.createObjectURL(image.file);
  const processedURL = imageProcessed && image.processedFile ? URL.createObjectURL(image.processedFile) : "";

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, x)));
  };

  const createColorBackground = async () => {
    if (!imageProcessed || !image.processedFile) return;
    
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
    if (imageProcessed) {
      createColorBackground();
    }
  }, [bgColor, imageProcessed]);

  return (
    <div>
      <div 
        ref={containerRef}
        className="relative rounded-lg overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        <div className="grid">
          <img
            className="rounded-lg w-full aspect-square object-cover col-start-1 row-start-1"
            src={url}
            alt={`Original image ${image.id}`}
          />
          <div className="col-start-1 row-start-1 relative">
            <img
              className="rounded-lg w-full aspect-square object-cover"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                backgroundColor: bgColor
              }}
              src={processedURL}
              alt={`Processed image ${image.id}`}
            />
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
              style={{ left: `${sliderPosition}%` }}
            />
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={handleSliderChange}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4"
        />
      </div>
      <div className="controls mt-2 flex gap-2 items-center">
        <button 
          onClick={() => db.images.delete(image.id)}
          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
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
        {processedURL && (
          <a 
            href={processedURL} 
            download={`transparent-bg-${image.id}.png`}
            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download Original
          </a>
        )}
      </div>
    </div>
  );
}
