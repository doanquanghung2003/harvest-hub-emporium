import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Upload } from 'lucide-react';

export function ImageUploadTest() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    console.log('Selected files:', selectedFiles);
    console.log('File details:', selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    })));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Image Upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            id="test-image-upload"
            onChange={handleFileSelect}
          />
          <label htmlFor="test-image-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-medium text-primary">Nhấn để tải ảnh</span>
                <span className="text-muted-foreground"> hoặc kéo thả ảnh vào đây</span>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (tối đa 10MB mỗi ảnh)</p>
            </div>
          </label>
        </div>

        {previews.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Xem trước ảnh:</h4>
            <div className="grid grid-cols-2 gap-2">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Thông tin files:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="text-sm p-2 bg-muted rounded">
              <p><strong>Tên:</strong> {file.name}</p>
              <p><strong>Kích thước:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Loại:</strong> {file.type}</p>
            </div>
          ))}
        </div>

        <Button onClick={handleSubmit} className="w-full">
          Test Upload ({selectedFiles.length} files)
        </Button>
      </CardContent>
    </Card>
  );
}
