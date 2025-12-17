import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { categoryService, Category } from "@/services/categoryService";

// Format dữ liệu category từ DB sang format cũ
interface CategoryDisplay {
  id: string;
  slug?: string;
  name: string;
  description: string;
  icon: string;
  itemCount: string;
  bgColor: string;
}

// Map màu nền dựa trên màu từ database hoặc mặc định
const getBgColor = (color?: string, index: number = 0): string => {
  if (color) {
    const colorMap: Record<string, string> = {
      'green': 'bg-green-50',
      'red': 'bg-red-50',
      'yellow': 'bg-yellow-50',
      'emerald': 'bg-emerald-50',
      'orange': 'bg-orange-50',
      'blue': 'bg-blue-50',
      'purple': 'bg-purple-50',
      'pink': 'bg-pink-50',
    };
    return colorMap[color.toLowerCase()] || 'bg-green-50';
  }
  
  // Màu mặc định theo index (giữ nguyên thứ tự như form cũ)
  const defaultColors = [
    'bg-green-50',
    'bg-red-50',
    'bg-yellow-50',
    'bg-emerald-50',
    'bg-orange-50',
    'bg-blue-50',
  ];
  return defaultColors[index % defaultColors.length];
};

// Map icon từ database hoặc dùng mặc định
const getIcon = (category: Category, index: number): string => {
  if (category.icon) return category.icon;
  
  // Icon mặc định theo index (giữ nguyên như form cũ)
  const defaultIcons = ['🥬', '🍎', '🌾', '🌱', '🚜', '🥛'];
  return defaultIcons[index % defaultIcons.length];
};

// Chuyển đổi category từ DB sang format hiển thị
const mapCategoryToDisplay = (category: Category, index: number): CategoryDisplay => {
  const itemCount = category.productCount 
    ? `${category.productCount}+ sản phẩm` 
    : '0 sản phẩm';
  
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description || '',
    icon: getIcon(category, index),
    itemCount: itemCount,
    bgColor: getBgColor(category.color, index),
  };
};

export function FeaturedCategories() {
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        // Lấy danh mục đang hoạt động, ưu tiên featured
        const allCategories = await categoryService.getActiveCategories();
        
        // Sắp xếp: featured trước, sau đó theo sortOrder
        const sortedCategories = allCategories
          .filter(cat => cat.level === 0 || !cat.level) // Chỉ lấy danh mục chính (level 0)
          .sort((a, b) => {
            // Featured trước
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            // Sau đó theo sortOrder
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          })
          .slice(0, 6) // Lấy tối đa 6 danh mục
          .map((cat, index) => mapCategoryToDisplay(cat, index)); // Map sang format cũ
        
        setCategories(sortedCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Mua sắm theo danh mục
            </h2>
            <p className="text-xl text-muted-foreground">
              Khám phá sản phẩm tươi ngon từ nông dân và nhà cung cấp địa phương
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Mua sắm theo danh mục
            </h2>
            <p className="text-xl text-muted-foreground">
              Khám phá sản phẩm tươi ngon từ nông dân và nhà cung cấp địa phương
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Chưa có danh mục nào
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Mua sắm theo danh mục
          </h2>
          <p className="text-xl text-muted-foreground">
            Khám phá sản phẩm tươi ngon từ nông dân và nhà cung cấp địa phương
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${category.bgColor}`}>
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      {category.description}
                    </p>
                    <p className="text-sm text-primary font-medium mb-4">
                      {category.itemCount}
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/categories/${category.slug || category.id}`}>
                        Xem danh mục
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" asChild>
            <Link to="/categories">
              Xem tất cả danh mục
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}