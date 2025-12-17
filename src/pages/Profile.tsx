import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, MapPin, Camera, Edit, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { addressService, type Province, type District, type Ward } from "@/services/addressService";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export default function Profile() {
  const { user, isAuthenticated, token, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    avatar: "",
    membershipType: "",
    membershipDate: ""
  });
  const [addressData, setAddressData] = useState({
    street: "",
    ward: "",
    district: "",
    city: ""
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Address dropdown states
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>("");
  const [selectedWardCode, setSelectedWardCode] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Get active tab from URL, default to "profile"
  const activeTab = searchParams.get("tab") || "profile";



  // Load user profile data
  useEffect(() => {
    if (user && token) {
      loadUserProfile();
    }
  }, [user, token]);

  // Re-sync address when provinces are loaded after addressData is set
  useEffect(() => {
    if (provinces.length > 0 && addressData.city && !selectedProvinceCode) {
      const syncAddress = async () => {
        const foundProvince = provinces.find(p => {
          const provinceName = p.name.toLowerCase().trim();
          const cityName = addressData.city.toLowerCase().trim();
          return provinceName === cityName || 
                 provinceName.includes(cityName) ||
                 cityName.includes(provinceName) ||
                 provinceName.replace(/Thành phố |Tỉnh /g, '') === cityName.replace(/Thành phố |Tỉnh /g, '');
        });
        
        if (foundProvince) {
          setSelectedProvinceCode(foundProvince.code);
          const districtData = await addressService.getDistricts(foundProvince.code);
          const sortedDistricts = districtData.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          setDistricts(sortedDistricts);
          
          if (addressData.district && sortedDistricts.length > 0) {
            const foundDistrict = sortedDistricts.find(d => {
              const districtName = d.name.toLowerCase().trim();
              const addressDistrict = addressData.district.toLowerCase().trim();
              return districtName === addressDistrict ||
                     districtName.includes(addressDistrict) ||
                     addressDistrict.includes(districtName) ||
                     districtName.replace(/Quận |Huyện /g, '') === addressDistrict.replace(/Quận |Huyện /g, '');
            });
            if (foundDistrict) {
              setSelectedDistrictCode(foundDistrict.code);
              const wardData = await addressService.getWards(foundDistrict.code);
              const sortedWards = wardData.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
              setWards(sortedWards);
              
              if (addressData.ward && sortedWards.length > 0) {
                const foundWard = sortedWards.find(w => {
                  const wardName = w.name.toLowerCase().trim();
                  const addressWard = addressData.ward.toLowerCase().trim();
                  return wardName === addressWard ||
                         wardName.includes(addressWard) ||
                         addressWard.includes(wardName) ||
                         wardName.replace(/Phường |Xã /g, '') === addressWard.replace(/Phường |Xã /g, '');
                });
                if (foundWard) {
                  setSelectedWardCode(foundWard.code);
                }
              }
            }
          }
        }
      };
      syncAddress();
    }
  }, [provinces.length, addressData.city, addressData.district, addressData.ward]);

  // Auto-open edit mode when navigating to address tab if address is empty
  useEffect(() => {
    if (activeTab === "address" && !addressData.street && !addressData.ward && !addressData.district && !addressData.city) {
      setIsEditingAddress(true);
    }
  }, [activeTab, addressData]);

  // Load provinces when component mounts
  useEffect(() => {
    const loadProvinces = async () => {
      setIsLoadingAddress(true);
      try {
        const data = await addressService.getProvinces();
        // Sort provinces alphabetically by name
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        setProvinces(sortedData);
      } catch (error) {
        console.error('Error loading provinces:', error);
      } finally {
        setIsLoadingAddress(false);
      }
    };
    loadProvinces();
  }, []);

  // Sync selected values when address data is loaded from server
  useEffect(() => {
    const syncAddressSelection = async () => {
      if (!addressData.city || provinces.length === 0) return;
      
      // Only sync if no selection has been made yet
      if (!selectedProvinceCode && addressData.city) {
        // Try to find province by exact match first, then partial match
        const foundProvince = provinces.find(p => {
          const provinceName = p.name.toLowerCase().trim();
          const cityName = addressData.city.toLowerCase().trim();
          return provinceName === cityName || 
                 provinceName.includes(cityName) ||
                 cityName.includes(provinceName) ||
                 provinceName.replace(/Thành phố |Tỉnh /g, '') === cityName.replace(/Thành phố |Tỉnh /g, '');
        });
        
        if (foundProvince) {
          setSelectedProvinceCode(foundProvince.code);
          // Load districts
          const districtData = await addressService.getDistricts(foundProvince.code);
          // Sort districts alphabetically
          const sortedDistricts = districtData.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          setDistricts(sortedDistricts);
          
          if (addressData.district && sortedDistricts.length > 0) {
            const foundDistrict = sortedDistricts.find(d => {
              const districtName = d.name.toLowerCase().trim();
              const addressDistrict = addressData.district.toLowerCase().trim();
              return districtName === addressDistrict ||
                     districtName.includes(addressDistrict) ||
                     addressDistrict.includes(districtName) ||
                     districtName.replace(/Quận |Huyện /g, '') === addressDistrict.replace(/Quận |Huyện /g, '');
            });
            if (foundDistrict) {
              setSelectedDistrictCode(foundDistrict.code);
              // Load wards
              const wardData = await addressService.getWards(foundDistrict.code);
              // Sort wards alphabetically
              const sortedWards = wardData.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
              setWards(sortedWards);
              
              if (addressData.ward && sortedWards.length > 0) {
                const foundWard = sortedWards.find(w => {
                  const wardName = w.name.toLowerCase().trim();
                  const addressWard = addressData.ward.toLowerCase().trim();
                  return wardName === addressWard ||
                         wardName.includes(addressWard) ||
                         addressWard.includes(wardName) ||
                         wardName.replace(/Phường |Xã /g, '') === addressWard.replace(/Phường |Xã /g, '');
                });
                if (foundWard) {
                  setSelectedWardCode(foundWard.code);
                }
              }
            }
          }
        }
      }
    };
    
    if (provinces.length > 0 && addressData.city && !selectedProvinceCode) {
      syncAddressSelection();
    }
  }, [provinces, addressData.city, addressData.district, addressData.ward, selectedProvinceCode]);

  // Load districts when province is selected
  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvinceCode(provinceCode);
    setSelectedDistrictCode("");
    setSelectedWardCode("");
    setDistricts([]);
    setWards([]);
    
    const province = provinces.find(p => p.code === provinceCode);
    if (province) {
      setAddressData({ ...addressData, city: province.name, district: "", ward: "" });
    }

    if (provinceCode) {
      setIsLoadingAddress(true);
      try {
        const data = await addressService.getDistricts(provinceCode);
        // Sort districts alphabetically
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        setDistricts(sortedData);
      } catch (error) {
        console.error('Error loading districts:', error);
      } finally {
        setIsLoadingAddress(false);
      }
    }
  };

  // Load wards when district is selected
  const handleDistrictChange = async (districtCode: string) => {
    setSelectedDistrictCode(districtCode);
    setSelectedWardCode("");
    setWards([]);
    
    const district = districts.find(d => d.code === districtCode);
    if (district) {
      setAddressData({ ...addressData, district: district.name, ward: "" });
    }

    if (districtCode) {
      setIsLoadingAddress(true);
      try {
        const data = await addressService.getWards(districtCode);
        // Sort wards alphabetically
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        setWards(sortedData);
      } catch (error) {
        console.error('Error loading wards:', error);
      } finally {
        setIsLoadingAddress(false);
      }
    }
  };

  // Handle ward selection
  const handleWardChange = (wardCode: string) => {
    setSelectedWardCode(wardCode);
    const ward = wards.find(w => w.code === wardCode);
    if (ward) {
      setAddressData({ ...addressData, ward: ward.name });
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setProfileData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phoneNumber || '',
          bio: userData.bio || 'Yêu thích nông sản sạch và an toàn',
          avatar: userData.avatar || '',
          membershipType: userData.membershipType || 'STANDARD',
          membershipDate: userData.membershipDate || ''
        });
        const loadedAddress = {
          street: userData.addressStreet || '',
          ward: userData.addressWard || '',
          district: userData.addressDistrict || '',
          city: userData.addressCity || ''
        };
        setAddressData(loadedAddress);
        
        // Try to find and select province/district/ward from loaded address
        // This will be handled by the syncAddressSelection useEffect
        // But we trigger it by ensuring provinces are loaded first
        if (loadedAddress.city && provinces.length === 0) {
          // If provinces not loaded yet, wait for them to load
          // The syncAddressSelection useEffect will handle it
        }
      } else {
        const errorData = await response.json();
        console.error('Error loading profile:', errorData);
        if (response.status === 401) {
          // Token is invalid, redirect to login
          navigate('/auth');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phoneNumber: profileData.phone,
          bio: profileData.bio
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Update token and user data if new token is provided
        if (result.token && result.user) {
          localStorage.setItem('token', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
          // Force re-authentication with new token
          window.location.reload();
        }

        setMessage("Thông tin đã được cập nhật thành công!");
        setMessageType("success");
        // Reload profile data
        loadUserProfile();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Có lỗi xảy ra khi cập nhật thông tin");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Có lỗi xảy ra khi cập nhật thông tin");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      // Tự động upload ngay khi chọn file
      setIsLoading(true);
      setMessage("");
      setMessageType("");
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch(`${API_BASE_URL}/api/user/avatar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (resp.ok) {
          const data = await resp.json();
          setProfileData(prev => ({ ...prev, avatar: data.url }));
          setMessage('Ảnh đại diện đã được cập nhật');
          setMessageType('success');

          // Update localStorage to sync with header
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            const userObj = JSON.parse(savedUser);
            userObj.avatar = data.url;
            localStorage.setItem('user', JSON.stringify(userObj));
            // Trigger storage event to update header
            window.dispatchEvent(new Event('storage'));
          }

          await loadUserProfile();
        } else {
          const err = await resp.json();
          setMessage(err.error || 'Upload ảnh thất bại');
          setMessageType('error');
        }
      } catch (e) {
        setMessage('Upload ảnh thất bại');
        setMessageType('error');
      } finally {
        setIsLoading(false);
        setAvatarFile(null);
        // reset input để có thể chọn lại cùng 1 file
        e.currentTarget.value = "";
      }
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateAddress = async () => {
    setIsLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          addressStreet: addressData.street,
          addressWard: addressData.ward,
          addressDistrict: addressData.district,
          addressCity: addressData.city
        })
      });

      if (response.ok) {
        // Also update seller address if user is a seller
        try {
          const sellerCheckResponse = await fetch(`${API_BASE_URL}/api/sellers/check/${user?.id}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
          });
          
          if (sellerCheckResponse.ok) {
            const sellerCheckData = await sellerCheckResponse.json();
            if (sellerCheckData.isSeller && sellerCheckData.seller?.id) {
              // Build full address string
              const fullAddress = [
                addressData.street,
                addressData.ward,
                addressData.district,
                addressData.city
              ].filter(Boolean).join(", ");
              
              // Update seller address
              const sellerUpdateResponse = await fetch(`${API_BASE_URL}/api/sellers/${sellerCheckData.seller.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  address: fullAddress,
                  ward: addressData.ward,
                  district: addressData.district,
                  city: addressData.city
                })
              });
              
              if (!sellerUpdateResponse.ok) {
                console.warn('Failed to sync address to seller profile');
              }
            }
          }
        } catch (syncError) {
          console.error('Error syncing address to seller profile:', syncError);
          // Don't fail the whole operation if sync fails
        }
        
        setMessage("Địa chỉ đã được cập nhật thành công!");
        setMessageType("success");
        setIsEditingAddress(false);
        // Reload profile data
        loadUserProfile();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Có lỗi xảy ra khi cập nhật địa chỉ");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Có lỗi xảy ra khi cập nhật địa chỉ");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEditAddress = () => {
    // Reload address data to reset changes
    loadUserProfile();
    setIsEditingAddress(false);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !token) return;
    setIsLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append('file', avatarFile);

      const resp = await fetch(`${API_BASE_URL}/api/user/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (resp.ok) {
        const data = await resp.json();
        setMessage('Ảnh đại diện đã được cập nhật');
        setProfileData(prev => ({ ...prev, avatar: data.url }));
        // Reload profile to update avatar url
        await loadUserProfile();
      } else {
        const err = await resp.json();
        setMessage(err.error || 'Upload ảnh thất bại');
      }
    } catch (e) {
      setMessage('Upload ảnh thất bại');
    } finally {
      setIsLoading(false);
      setAvatarFile(null);
    }
  };

  const membershipType = (profileData.membershipType || "STANDARD").toUpperCase();
  const membershipTiers: Record<string, { label: string; description: string; badgeClass: string }> = {
    STANDARD: {
      label: "Khách hàng thân thiết",
      description: "Chi tiêu ít nhất 1.000.000đ để mở khóa VIP 1.",
      badgeClass: "bg-muted text-muted-foreground"
    },
    VIP1: {
      label: "VIP 1",
      description: "Đã chi tiêu từ 1.000.000đ đến dưới 3.000.000đ.",
      badgeClass: "bg-amber-100 text-amber-700"
    },
    VIP2: {
      label: "VIP 2",
      description: "Đã chi tiêu từ 3.000.000đ đến dưới 5.000.000đ.",
      badgeClass: "bg-orange-100 text-orange-700"
    },
    VIP3: {
      label: "VIP 3",
      description: "Đã chi tiêu từ 5.000.000đ trở lên.",
      badgeClass: "bg-red-100 text-red-700"
    }
  };
  const membershipInfo = membershipTiers[membershipType] || membershipTiers.STANDARD;

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-8">Hồ Sơ Cá Nhân</h1>

            {message && (
              <div className={`mb-4 p-3 rounded text-sm ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                {message}
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setSearchParams({ tab: value });
              }}
              className="space-y-8"
            >
              <TabsList>
                <TabsTrigger value="profile">Thông Tin Cá Nhân</TabsTrigger>
                <TabsTrigger value="address">Địa Chỉ</TabsTrigger>
                <TabsTrigger value="security">Bảo Mật</TabsTrigger>
                <TabsTrigger value="preferences">Cài Đặt</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <div className="grid lg:grid-cols-3 gap-8">
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle>Ảnh Đại Diện</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4 flex flex-col flex-1">
                      <div className="space-y-4">
                        <Avatar className="w-32 h-32 mx-auto">
                          <AvatarImage src={profileData.avatar || '/placeholder.svg'} alt="Profile" />
                          <AvatarFallback className="text-2xl">
                            {`${(profileData.firstName?.[0] || '').toUpperCase()}${(profileData.lastName?.[0] || '').toUpperCase()}` || 'NA'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center justify-center gap-3">
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                          <Button variant="outline" size="sm" onClick={openFilePicker} disabled={isLoading}>
                            <Camera className="h-4 w-4 mr-2" />
                            Thay Đổi Ảnh
                          </Button>
                          {/* Nút tải ảnh đã được loại bỏ – upload tự động sau khi chọn */}
                        </div>
                        <div className="space-y-2">
                          <Badge className={`border-0 ${membershipInfo.badgeClass}`}>
                            {membershipInfo.label}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {membershipInfo.description}
                          </p>
                          {profileData.membershipDate && (
                            <p className="text-xs text-muted-foreground">
                              Thăng hạng từ ngày {new Date(profileData.membershipDate).toLocaleDateString("vi-VN")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto pt-4">
                        <Button variant="destructive" className="w-full" onClick={() => {
                          logout();
                          navigate('/');
                        }}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Đăng Xuất
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Thông Tin Cá Nhân
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex flex-col flex-1">
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">Họ</Label>
                            <Input
                              id="firstName"
                              value={profileData.firstName}
                              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Tên</Label>
                            <Input
                              id="lastName"
                              value={profileData.lastName}
                              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              id="email"
                              value={profileData.email}
                              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Số Điện Thoại</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              id="phone"
                              value={profileData.phone}
                              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio">Giới Thiệu</Label>
                          <Input
                            id="bio"
                            value={profileData.bio}
                            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-auto pt-4">
                        <Button onClick={handleUpdateProfile} disabled={isLoading}>
                          <Edit className="h-4 w-4 mr-2" />
                          {isLoading ? "Đang cập nhật..." : "Cập Nhật Thông Tin"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="address">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Địa Chỉ Giao Hàng
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <Badge>Địa Chỉ Mặc Định</Badge>
                        {!isEditingAddress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingAddress(true)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh Sửa
                          </Button>
                        )}
                      </div>

                      {!isEditingAddress ? (
                        <>
                          <h3 className="font-semibold">{profileData.firstName} {profileData.lastName}</h3>
                          {addressData.street || addressData.ward || addressData.district || addressData.city ? (
                            <>
                              <p className="text-muted-foreground">
                                {addressData.street && `${addressData.street}, `}
                                {addressData.ward && `Phường ${addressData.ward}`}
                                {addressData.ward && addressData.district && ', '}
                                {addressData.district && `Quận ${addressData.district}`}
                                {addressData.district && addressData.city && ', '}
                                {addressData.city}
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground">Chưa cập nhật địa chỉ</p>
                          )}
                          <p className="text-muted-foreground">SĐT: {profileData.phone || 'Chưa cập nhật'}</p>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="addressCity">Tỉnh/Thành phố</Label>
                            <Select
                              value={selectedProvinceCode}
                              onValueChange={handleProvinceChange}
                              disabled={isLoadingAddress || provinces.length === 0}
                            >
                              <SelectTrigger id="addressCity">
                                <SelectValue placeholder={addressData.city || "Chọn Tỉnh/Thành phố"}>
                                  {selectedProvinceCode && provinces.find(p => p.code === selectedProvinceCode)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {provinces.length > 0 ? (
                                  provinces.map((province) => (
                                    <SelectItem key={province.code} value={province.code}>
                                      {province.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="addressDistrict">Quận/Huyện</Label>
                            <Select
                              value={selectedDistrictCode}
                              onValueChange={handleDistrictChange}
                              disabled={!selectedProvinceCode || isLoadingAddress}
                            >
                              <SelectTrigger id="addressDistrict">
                                <SelectValue placeholder={addressData.district || "Chọn Quận/Huyện"}>
                                  {selectedDistrictCode && districts.find(d => d.code === selectedDistrictCode)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {districts.length > 0 ? (
                                  districts.map((district) => (
                                    <SelectItem key={district.code} value={district.code}>
                                      {district.name}
                                    </SelectItem>
                                  ))
                                ) : selectedProvinceCode ? (
                                  <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                                ) : (
                                  <SelectItem value="none" disabled>Chọn Tỉnh/Thành phố trước</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="addressWard">Phường/Xã</Label>
                            <Select
                              value={selectedWardCode}
                              onValueChange={handleWardChange}
                              disabled={!selectedDistrictCode || isLoadingAddress}
                            >
                              <SelectTrigger id="addressWard">
                                <SelectValue placeholder={addressData.ward || "Chọn Phường/Xã"}>
                                  {selectedWardCode && wards.find(w => w.code === selectedWardCode)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {wards.length > 0 ? (
                                  wards.map((ward) => (
                                    <SelectItem key={ward.code} value={ward.code}>
                                      {ward.name}
                                    </SelectItem>
                                  ))
                                ) : selectedDistrictCode ? (
                                  <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                                ) : (
                                  <SelectItem value="none" disabled>Chọn Quận/Huyện trước</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="addressStreet">Đường/Địa chỉ</Label>
                            <Input
                              id="addressStreet"
                              value={addressData.street}
                              onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                              placeholder="Nhập số nhà và tên đường"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleUpdateAddress}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              {isLoading ? "Đang cập nhật..." : "Lưu Địa Chỉ"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancelEditAddress}
                              disabled={isLoading}
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button variant="outline" disabled={isEditingAddress}>
                      Thêm Địa Chỉ Mới
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Bảo Mật Tài Khoản</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Mật Khẩu Hiện Tại</Label>
                        <Input id="currentPassword" type="password" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Mật Khẩu Mới</Label>
                        <Input id="newPassword" type="password" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmNewPassword">Xác Nhận Mật Khẩu Mới</Label>
                        <Input id="confirmNewPassword" type="password" />
                      </div>

                      <Button>Đổi Mật Khẩu</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle>Cài Đặt Thông Báo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Email về đơn hàng</h3>
                        <p className="text-sm text-muted-foreground">Nhận thông báo qua email về trạng thái đơn hàng</p>
                      </div>
                      <Button variant="outline" size="sm">Bật</Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Khuyến mãi</h3>
                        <p className="text-sm text-muted-foreground">Nhận thông báo về các chương trình khuyến mãi</p>
                      </div>
                      <Button variant="outline" size="sm">Bật</Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Sản phẩm mới</h3>
                        <p className="text-sm text-muted-foreground">Thông báo khi có sản phẩm mới</p>
                      </div>
                      <Button variant="outline" size="sm">Tắt</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}