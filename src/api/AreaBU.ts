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
//   postAreaBU() {
//     return apiClient.post(`${apiClient.defaults.baseURL}/Area/getlist`, {});
//   },
//   postAreaBUId(id){
//     return apiClient.get(`${apiClient.defaults.baseURL}/Area/getone/${id}`);
//   }
// };

// import { CapacitorHttp } from '@capacitor/core';
// import baseURLMixin from '@/mixins/baseURLMixin';

// const baseURL = baseURLMixin.url;

// export default {
//   /**
//    * Lấy danh sách Area - Chuyển từ axios.post sang CapacitorHttp.post
//    */
//   async postAreaBU() {
//     const options = {
//       url: `${baseURL}/Area/getlist`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       data: {}, // Body rỗng cho request POST
//     };

//     try {
//       const response = await CapacitorHttp.post(options);
//       return response;
//     } catch (error) {
//       console.error('Lỗi lấy danh sách Area (Native):', error);
//       throw error;
//     }
//   },

//   /**
//    * Lấy chi tiết Area theo ID - Chuyển từ axios.get sang CapacitorHttp.get
//    */
//   async postAreaBUId(id) {
//     const options = {
//       url: `${baseURL}/Area/getone/${id}`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     };

//     try {
//       const response = await CapacitorHttp.get(options);
//       return response;
//     } catch (error) {
//       console.error(`Lỗi lấy Area ID ${id} (Native):`, error);
//       throw error;
//     }
//   }
// };

import request from '@/services/apiService';

export default {
  postAreaBU() {
    return request.post('/Area/getlist', {});
  },
  getAreaBUId(id: any) {
    return request.get(`/Area/getone/${id}`);
  }
};