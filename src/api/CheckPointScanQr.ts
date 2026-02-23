// import axios from 'axios';
// import baseURLMixin from '@/mixins/baseURLMixin';

// const apiClient = axios.create({
//   baseURL: baseURLMixin.url,
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   timeout: 10000,
// });

// export default {
//   postCheckPointScanQr(listScanQr) {
//     return apiClient.get(`${apiClient.defaults.baseURL}/CheckPointView/scanqr/${listScanQr.cpwId}/${listScanQr.cpwCode}`);
//   }
// };

// import { CapacitorHttp } from '@capacitor/core';
// import baseURLMixin from '@/mixins/baseURLMixin';

// // Lấy baseURL từ mixin
// const baseURL = baseURLMixin.url;

// export default {
//   /**
//    * Sử dụng async/await để xử lý bất đồng bộ vì CapacitorHttp trả về Promise
//    */
//   async postCheckPointScanQr(listScanQr) {
//     const options = {
//       // Kết hợp URL tương tự như cách bạn làm với Axios
//       url: `${baseURL}/CheckPointView/scanqr/${listScanQr.cpwId}/${listScanQr.cpwCode}`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       // Capacitor tự động xử lý các thông số kết nối ở tầng Native (Android/iOS)
//       // giúp tránh lỗi CORS hoàn toàn.
//     };

//     try {
//       // Gọi method GET từ CapacitorHttp
//       const response = await CapacitorHttp.get(options);

//       /**
//        * CapacitorHttp trả về cấu trúc: { data, status, headers }
//        * Nó tương thích khá tốt với logic xử lý kết quả hiện tại của bạn.
//        */
//       return response;
//     } catch (error) {
//       console.error('Lỗi khi quét QR qua Native HTTP:', error);
//       throw error;
//     }
//   }
// };

import request from '@/services/apiService';

export default {
  getCheckPointScanQr(listScanQr: any) {
    return request.get(`/CheckPointView/scanqr/${listScanQr.cpwId}/${listScanQr.cpwCode}`);
  }
};