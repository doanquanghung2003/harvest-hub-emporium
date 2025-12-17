// Helper function to map city to region (Miền Bắc, Miền Trung, Miền Nam, Khác)
export const getRegionFromCity = (city: string | undefined): string => {
  if (!city) return 'Khác';
  const cityLower = city.toLowerCase();
  
  // Miền Bắc
  const mienBac = [
    'hà nội', 'hanoi', 'hải phòng', 'haiphong', 'quảng ninh', 'quang ninh',
    'hải dương', 'hai duong', 'hưng yên', 'hung yen', 'thái bình', 'thai binh',
    'hà nam', 'ha nam', 'nam định', 'nam dinh', 'ninh bình', 'ninh binh',
    'vĩnh phúc', 'vinh phuc', 'bắc ninh', 'bac ninh', 'lạng sơn', 'lang son',
    'lào cai', 'lao cai', 'yên bái', 'yen bai', 'tuyên quang', 'tuyen quang',
    'thái nguyên', 'thai nguyen', 'bắc giang', 'bac giang', 'phú thọ', 'phu tho',
    'điện biên', 'dien bien', 'sơn la', 'son la', 'hoà bình', 'hoa binh',
    'cao bằng', 'cao bang', 'bắc kạn', 'bac kan', 'hà giang', 'ha giang'
  ];
  
  // Miền Trung
  const mienTrung = [
    'thanh hóa', 'thanh hoa', 'nghệ an', 'nghe an', 'hà tĩnh', 'ha tinh',
    'quảng bình', 'quang binh', 'quảng trị', 'quang tri', 'thừa thiên huế', 'thua thien hue',
    'đà nẵng', 'da nang', 'quảng nam', 'quang nam', 'quảng ngãi', 'quang ngai',
    'bình định', 'binh dinh', 'phú yên', 'phu yen', 'khánh hòa', 'khanh hoa',
    'ninh thuận', 'ninh thuan', 'bình thuận', 'binh thuan'
  ];
  
  // Miền Nam
  const mienNam = [
    'hồ chí minh', 'ho chi minh', 'tp.hcm', 'sài gòn', 'sai gon',
    'bà rịa - vũng tàu', 'ba ria - vung tau', 'bà rịa vũng tàu', 'ba ria vung tau',
    'đồng nai', 'dong nai', 'bình dương', 'binh duong', 'bình phước', 'binh phuoc',
    'tây ninh', 'tay ninh', 'long an', 'tiền giang', 'tien giang', 'bến tre', 'ben tre',
    'trà vinh', 'tra vinh', 'vĩnh long', 'vinh long', 'đồng tháp', 'dong thap',
    'an giang', 'kiên giang', 'kien giang', 'cà mau', 'ca mau', 'bạc liêu', 'bac lieu',
    'sóc trăng', 'soc trang', 'hậu giang', 'hau giang', 'cần thơ', 'can tho'
  ];
  
  if (mienBac.some(c => cityLower.includes(c))) return 'Miền Bắc';
  if (mienTrung.some(c => cityLower.includes(c))) return 'Miền Trung';
  if (mienNam.some(c => cityLower.includes(c))) return 'Miền Nam';
  return 'Khác';
};
