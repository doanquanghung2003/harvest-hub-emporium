// Service để lấy dữ liệu địa chỉ Việt Nam từ API công khai
// Sử dụng API v2 từ https://provinces.open-api.vn/ (sau sáp nhập tỉnh thành 07/2025)
// Dữ liệu đã được cập nhật theo cấu trúc hành chính mới (34 tỉnh/thành phố)

export interface Province {
  code: string;
  name: string;
}

export interface District {
  code: string;
  name: string;
  province_code: string;
}

export interface Ward {
  code: string;
  name: string;
  district_code: string;
}

class AddressService {
  // Sử dụng VNAppMob API v2 - cập nhật sau sáp nhập tỉnh thành 07/2025
  // API này có dữ liệu chính xác về quận/huyện và phường/xã sau sáp nhập
  private baseUrl = 'https://vapi.vnappmob.com/api/v2/province';

  // Lấy danh sách tất cả tỉnh/thành phố (34 tỉnh/thành phố sau sáp nhập)
  async getProvinces(): Promise<Province[]> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch provinces');
      }
      const data = await response.json();
      // VNAppMob API trả về { results: [...] }
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((p: any) => ({
          code: p.province_id || p.code || String(p.province_id),
          name: p.province_name || p.name
        })).filter((p: any) => p.code && p.name);
      }
      return [];
    } catch (error) {
      console.error('Error fetching provinces:', error);
      // Fallback: thử provinces.open-api.vn
      try {
        const fallbackResponse = await fetch('https://provinces.open-api.vn/api/p/');
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }
      return [];
    }
  }

  // Lấy danh sách quận/huyện theo mã tỉnh/thành phố
  async getDistricts(provinceCode: string): Promise<District[]> {
    try {
      const response = await fetch(`${this.baseUrl}/district/${provinceCode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch districts');
      }
      const data = await response.json();
      // VNAppMob API trả về { results: [...] }
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((d: any) => ({
          code: d.district_id || d.code || String(d.district_id),
          name: d.district_name || d.name,
          province_code: d.province_id || provinceCode
        })).filter((d: any) => d.code && d.name);
      }
      return [];
    } catch (error) {
      console.error('Error fetching districts:', error);
      // Fallback: thử provinces.open-api.vn
      try {
        const fallbackResponse = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return data.districts || [];
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }
      return [];
    }
  }

  // Lấy danh sách phường/xã theo mã quận/huyện
  async getWards(districtCode: string): Promise<Ward[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ward/${districtCode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch wards');
      }
      const data = await response.json();
      // VNAppMob API trả về { results: [...] }
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((w: any) => ({
          code: w.ward_id || w.code || String(w.ward_id),
          name: w.ward_name || w.name,
          district_code: w.district_id || districtCode
        })).filter((w: any) => w.code && w.name);
      }
      return [];
    } catch (error) {
      console.error('Error fetching wards:', error);
      // Fallback: thử provinces.open-api.vn
      try {
        const fallbackResponse = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return data.wards || [];
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }
      return [];
    }
  }

  // Tìm kiếm tỉnh/thành phố theo tên
  async searchProvince(query: string): Promise<Province[]> {
    try {
      const provinces = await this.getProvinces();
      const lowerQuery = query.toLowerCase();
      return provinces.filter(p => 
        p.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching provinces:', error);
      return [];
    }
  }

  // Tìm kiếm quận/huyện theo tên và mã tỉnh
  async searchDistrict(query: string, provinceCode: string): Promise<District[]> {
    try {
      const districts = await this.getDistricts(provinceCode);
      const lowerQuery = query.toLowerCase();
      return districts.filter(d => 
        d.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching districts:', error);
      return [];
    }
  }

  // Tìm kiếm phường/xã theo tên và mã quận
  async searchWard(query: string, districtCode: string): Promise<Ward[]> {
    try {
      const wards = await this.getWards(districtCode);
      const lowerQuery = query.toLowerCase();
      return wards.filter(w => 
        w.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching wards:', error);
      return [];
    }
  }
}

export const addressService = new AddressService();

