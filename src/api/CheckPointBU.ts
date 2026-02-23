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
//   postCheckPointBU() {
//     return apiClient.post(`${apiClient.defaults.baseURL}/CheckPoint/getlist`, {});
//   },
//   postCheckPointBUId(id){
//     return apiClient.get(`${apiClient.defaults.baseURL}/CheckPoint/getone/${id}`);
//   }
// };

// import { CapacitorHttp } from '@capacitor/core';
// import baseURLMixin from '@/mixins/baseURLMixin';

// const baseURL = baseURLMixin.url;

// export default {
//   /**
//    * Chuyển đổi postCheckPointBU sang Capacitor Native HTTP
//    */
//   async postCheckPointBU() {
//     const options = {
//       url: `${baseURL}/CheckPoint/getlist`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       data: {}, // Body của request POST
//     };

//     try {
//       const response = await CapacitorHttp.post(options);
//       return response;
//     } catch (error) {
//       console.error('Lỗi postCheckPointBU:', error);
//       throw error;
//     }
//   },

//   /**
//    * Chuyển đổi postCheckPointBUId sang Capacitor Native HTTP
//    */
//   async postCheckPointBUId(id) {
//     const options = {
//       url: `${baseURL}/CheckPoint/getone/${id}`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     };

//     try {
//       const response = await CapacitorHttp.get(options);
//       return response;
//     } catch (error) {
//       console.error('Lỗi postCheckPointBUId:', error);
//       throw error;
//     }
//   }
// };

import request from '@/services/apiService';

export default {
  postCheckPointBU() {
    return request.post('/CheckPoint/getlist', {});
  },
  getCheckPointBUId(id: any) {
    return request.get(`/CheckPoint/getone/${id}`);
  }
};