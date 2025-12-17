import { Card, CardContent } from "@/components/ui/card";
import { Users, Truck, Leaf, Award } from "lucide-react";

const stats = [
  {
    icon: Users,
    number: "10,000+",
    label: "Khách hàng hài lòng",
    description: "Người mua hài lòng trên toàn quốc",
  },
  {
    icon: Leaf,
    number: "500+",
    label: "Nông dân địa phương",
    description: "Nông dân uy tín trong mạng lưới",
  },
  {
    icon: Truck,
    number: "50,000+",
    label: "Đơn hàng đã giao",
    description: "Sản phẩm tươi được giao đúng hạn",
  },
  {
    icon: Award,
    number: "98%",
    label: "Đánh giá chất lượng",
    description: "Tỷ lệ hài lòng của khách hàng",
  },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Được tin tưởng bởi hàng nghìn người
          </h2>
          <p className="text-xl opacity-90">
            Tham gia cộng đồng nông dân và khách hàng đang phát triển
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <stat.icon className="h-12 w-12 mx-auto mb-4 opacity-80" />
                </div>
                <div className="text-3xl md:text-4xl font-bold mb-2">
                  {stat.number}
                </div>
                <div className="text-lg font-semibold mb-2">
                  {stat.label}
                </div>
                <p className="text-sm opacity-80">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}