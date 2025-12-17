import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Product, ProductFormData } from '@/types/product';
import { productService } from '@/services/productService';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}



const STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Không hoạt động' },
  { value: 'out_of_stock', label: 'Hết hàng' },
  { value: 'pending', label: 'Chờ duyệt' },
];

export function ProductForm({ product, onSubmit, onCancel, isLoading = false }: ProductFormProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    shortDescription: '',
    category: '',
    price: 0,
    originalPrice: 0,
    stock: 0,
    images: [],
    detailImages: [],
    tags: [],
    status: 'active',
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    specifications: {},
  });

  const [newTag, setNewTag] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [detailImagePreviews, setDetailImagePreviews] = useState<string[]>([]);
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const data = await productService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription || '',
        category: product.category,
        price: product.price,
        originalPrice: product.originalPrice || 0,
        stock: product.stock,
        images: [], // Reset images for new uploads
        detailImages: [], // Reset detail images for new uploads
        tags: product.tags || [],
        status: product.status,
        weight: product.weight || 0,
        dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
        specifications: product.specifications || {},
      });
      setImagePreviews(product.images || []);
      setDetailImagePreviews(product.detailImages || []);
    }
  }, [product]);

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'detail') => {
    const files = Array.from(event.target.files || []);
    console.log(`handleImageChange called for ${type}:`, files);

    if (type === 'main') {
      setFormData(prev => {
        const newImages = [...prev.images, ...files];
        console.log('Updated main images:', newImages);
        return { ...prev, images: newImages };
      });
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    } else {
      setFormData(prev => {
        const newDetailImages = [...(prev.detailImages || []), ...files];
        console.log('Updated detail images:', newDetailImages);
        return { ...prev, detailImages: newDetailImages };
      });
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setDetailImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number, type: 'main' | 'detail') => {
    if (type === 'main') {
      setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setFormData(prev => ({
        ...prev,
        detailImages: (prev.detailImages || []).filter((_, i) => i !== index)
      }));
      setDetailImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const addSpecification = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [newSpecKey.trim()]: newSpecValue.trim()
        }
      }));
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specifications };
      delete newSpecs[key];
      return { ...prev, specifications: newSpecs };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ProductForm submitting data:', formData);
    console.log('Images in formData:', formData.images);
    console.log('Detail images in formData:', formData.detailImages);
    console.log('Images type:', typeof formData.images);
    console.log('Images length:', formData.images?.length);
    console.log('First image:', formData.images?.[0]);
    console.log('First image type:', typeof formData.images?.[0]);
    console.log('First image instanceof File:', formData.images?.[0] instanceof File);

    // Validation
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!formData.description.trim()) {
      alert('Vui lòng nhập mô tả sản phẩm');
      return;
    }
    if (!formData.category) {
      alert('Vui lòng chọn danh mục');
      return;
    }
    if (formData.price <= 0) {
      alert('Vui lòng nhập giá hợp lệ');
      return;
    }
    if (formData.stock < 0) {
      alert('Vui lòng nhập số lượng hợp lệ');
      return;
    }

    try {
      await onSubmit(formData);
      console.log('ProductForm submit successful');
    } catch (error) {
      console.error('ProductForm submit error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thông tin cơ bản */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên sản phẩm *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nhập tên sản phẩm"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shortDescription">Mô tả ngắn</Label>
              <Input
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                placeholder="Mô tả ngắn gọn về sản phẩm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả chi tiết *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Mô tả chi tiết về sản phẩm"
                rows={4}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Danh mục *</Label>
              <Select
                defaultValue={formData.category || undefined}
                onValueChange={(value) => handleInputChange('category', value)}
                modal={false}
                disabled={isLoadingCategories}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCategories ? "Đang tải..." : "Chọn danh mục"} />
                </SelectTrigger>
                <SelectContent position="popper">
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Giá bán (VNĐ) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="originalPrice">Giá gốc (VNĐ)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => handleInputChange('originalPrice', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock">Số lượng tồn kho *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Trạng thái *</Label>
                <Select defaultValue={formData.status} onValueChange={(value) => handleInputChange('status', value)} modal={false}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ảnh sản phẩm */}
        <Card>
          <CardHeader>
            <CardTitle>Ảnh sản phẩm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Ảnh chính</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="main-images"
                  onChange={(e) => handleImageChange(e, 'main')}
                />
                <label htmlFor="main-images" className="cursor-pointer">
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
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid gap-2">
                <Label>Xem trước ảnh chính</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removeImage(index, 'main')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Ảnh chi tiết</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="detail-images"
                  onChange={(e) => handleImageChange(e, 'detail')}
                />
                <label htmlFor="detail-images" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="font-medium text-primary">Thêm ảnh chi tiết</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {detailImagePreviews.length > 0 && (
              <div className="grid gap-2">
                <Label>Xem trước ảnh chi tiết</Label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {detailImagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <img src={preview} alt={`Detail ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-5 w-5 p-0"
                        onClick={() => removeImage(index, 'detail')}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nhập tag mới"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag} disabled={!newTag.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thông tin bổ sung */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin bổ sung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="weight">Trọng lượng (gram)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', Number(e.target.value))}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Kích thước (cm)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Dài"
                type="number"
                value={formData.dimensions?.length || 0}
                onChange={(e) => handleInputChange('dimensions', {
                  ...formData.dimensions,
                  length: Number(e.target.value)
                })}
                min="0"
              />
              <Input
                placeholder="Rộng"
                type="number"
                value={formData.dimensions?.width || 0}
                onChange={(e) => handleInputChange('dimensions', {
                  ...formData.dimensions,
                  width: Number(e.target.value)
                })}
                min="0"
              />
              <Input
                placeholder="Cao"
                type="number"
                value={formData.dimensions?.height || 0}
                onChange={(e) => handleInputChange('dimensions', {
                  ...formData.dimensions,
                  height: Number(e.target.value)
                })}
                min="0"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Thông số kỹ thuật</Label>
            <div className="flex gap-2">
              <Input
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="Tên thông số"
              />
              <Input
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                placeholder="Giá trị"
              />
              <Button type="button" onClick={addSpecification} disabled={!newSpecKey.trim() || !newSpecValue.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {Object.keys(formData.specifications || {}).length > 0 && (
              <div className="space-y-2">
                {Object.entries(formData.specifications || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">{key}:</span>
                    <span>{value}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpecification(key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang xử lý...' : product ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}
        </Button>
      </div>
    </form>
  );
}
