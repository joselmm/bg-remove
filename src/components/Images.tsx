import React, { useState } from "react";
import type { ImageFile } from "../App";
import { EditModal } from "./EditModal";

interface ImagesProps {
  images: ImageFile[];
  onDelete: (id: number) => void;
}

export function Images({ images, onDelete }: ImagesProps) {
  return (
    <div>
      <h2 className="hidden text-gray-800 text-xl font-semibold mb-4">Images: {images.length}</h2>
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => {
          if (image.file.type.includes("video")) {
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
    <div className="bg-white rounded-lg shadow-md p-3">
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

// helpers (pegarlos arriba del componente o dentro del archivo)
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Insert image into ONLYOFFICE document.
 * @param {ImageFile} image - el objeto image de tu array
 */
async function insertImageIntoDocument(image) {
  if (!image) return;

  // seleccionar la fuente preferida: processedFile si existe, si no el original file
  const fileToUse = image.processedFile || image.file;
  if (!fileToUse) return;

  // Si ya tienes una data URL (por ejemplo image.processedUrl) y empieza con data:, úsala directamente
  if (image.processedUrl && typeof image.processedUrl === 'string' && image.processedUrl.startsWith('data:')) {
    return pasteDataUrlIntoDoc(image.processedUrl, image);
  }

  try {
    // Convertir Blob/File a data URL (base64)
    let dataUrl;
    if (fileToUse instanceof Blob) {
      dataUrl = await blobToDataURL(fileToUse);
    } else if (typeof fileToUse === 'string' && (fileToUse.startsWith('blob:') || fileToUse.startsWith('http'))) {
      // si es un object URL o remote URL -> fetch y blob
      const resp = await fetch(fileToUse);
      const b = await resp.blob();
      dataUrl = await blobToDataURL(b);
    } else {
      // fallback: si es File-like (File extends Blob) FileReader manejará arriba
      dataUrl = await blobToDataURL(fileToUse);
    }

    return pasteDataUrlIntoDoc(dataUrl, image);
  } catch (err) {
    /* PRESTA ATENCION AQUI QUIERO QUE PONGAS UN */
  }
}

/**
 * Hace el PasteHtml (ONLYOFFICE) o fallback.
 * @param {string} dataUrl - data:image/png;base64,...
 * @param {object} image - objeto image (para alt o filename)
 */
function pasteDataUrlIntoDoc(dataUrl, image) {
  const alt = `Image ${image && image.id ? image.id : ''}`;
  // puedes ajustar estilo inline (max-width) según necesites
  const html = `<img src="${dataUrl}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;" />`;
  const wrapped = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>';

  // Si estamos dentro de ONLYOFFICE
  if (
    typeof window !== "undefined" &&
    window.hasOwnProperty("Asc") &&
    window["Asc"].hasOwnProperty("plugin") &&
    typeof window["Asc"]["plugin"].executeMethod === 'function'
  ) {
    try {
      window["Asc"].plugin.executeMethod('PasteHtml', [wrapped], function () {
        console.info('Image pasted into document.');
      });
    } catch (e) {
      console.error('Asc PasteHtml failed:', e);
      // fallback: abrir la imagen en nueva pestaña
      if (typeof window !== 'undefined') {
        const url = dataUrl;
        window.open(url, '_blank');
      }
    }
  } else {
    // fuera de OnlyOffice: abrir en pestaña nueva (usuario puede copiar/guardar)
    if (typeof window !== 'undefined') {
      window.open(dataUrl, '_blank');
    }
  }
}

// helper pequeño para escapar el alt (evita inyección)
// TypeScript-safe
function escapeHtml(s: unknown): string {
  const str = String(s);
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return str.replace(/[&<>"']/g, (c: string) => {
    return map[c] ?? '';
  });
}



function ImageSpot({ image, onDelete }: ImageSpotProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState("");

  const url = URL.createObjectURL(image.file);
  const processedURL = image.processedFile ? URL.createObjectURL(image.processedFile) : "";
  const isProcessing = !image.processedFile;

  const handleEditSave = (editedImageUrl: string) => {
    setProcessedImageUrl(editedImageUrl);
  };

  const transparentBg = `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURb+/v////5nD/3QAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBjTYwABQSCglEENMxgYGAAynwRB8BEAgQAAAABJRU5ErkJggg==")`;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative">
        {isProcessing ? (
          <div className="relative">
            <img
              className="w-full aspect-square object-cover opacity-50 transition-opacity duration-200"
              src={url}
              alt={`Processing image ${image.id}`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span className="text-white font-medium processing-text">Processing...</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="w-full aspect-square"
            style={{
              background: transparentBg,
              backgroundRepeat: 'repeat'
            }}
          >
            <img
              className="w-full h-full object-cover transition-opacity duration-200"
              src={processedImageUrl || processedURL}
              alt={`Processed image ${image.id}`}
            />
          </div>
        )}
      </div>

      {!isProcessing && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => onDelete(image.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm text-gray-700 btn-delete-label">Delete</span>
            </button>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"

            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-sm text-gray-700 btn-edit-label">Edit</span>
            </button>

            <a
              href={processedImageUrl || processedURL}
              download={`processed-${image.id}.png`}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"

            >
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-sm text-gray-700 btn-download-label">Download</span>
            </a>

            {(
              typeof window !== "undefined" &&
              window.hasOwnProperty("Asc") &&
              window["Asc"].hasOwnProperty("plugin") &&
              window["Asc"]["plugin"].hasOwnProperty("executeCommand")
            ) && (
                <button
                  onClick={()=>insertImageIntoDocument(image)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="text-sm text-gray-700 btn-insert-label">Insert</span>
                </button>
              )}


          </div>
        </div>
      )}

      <EditModal
        image={image}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
      />
    </div>
  )
    ;
}
