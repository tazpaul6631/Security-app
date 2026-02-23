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
//   postPointReport(id) {
//     return apiClient.post(`${apiClient.defaults.baseURL}/PointReportView/getlist`, {cpId: id});
//   },
//   postPointReportId(id){
//     return apiClient.get(`${apiClient.defaults.baseURL}/PointReportView/getone/${id}`);
//   }
// };

// import { CapacitorHttp } from '@capacitor/core';
// import baseURLMixin from '@/mixins/baseURLMixin';

// const baseURL = baseURLMixin.url;

// export default {
//   /**
//    * Lấy danh sách PointReport theo ID - Chuyển sang CapacitorHttp.post
//    */
//   async postPointReport(id) {
//     const options = {
//       url: `${baseURL}/PointReportView/getlist`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       data: {
//         cpId: id
//       },
//     };

//     try {
//       const response = await CapacitorHttp.post(options);
//       return response;
//     } catch (error) {
//       console.error('Lỗi lấy danh sách PointReport (Native):', error);
//       throw error;
//     }
//   },

//   /**
//    * Lấy chi tiết PointReport theo ID - Chuyển sang CapacitorHttp.get
//    */
//   async postPointReportId(id) {
//     const options = {
//       url: `${baseURL}/PointReportView/getone/${id}`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     };

//     try {
//       const response = await CapacitorHttp.get(options);
//       return response;
//     } catch (error) {
//       console.error(`Lỗi lấy PointReport ID ${id} (Native):`, error);
//       throw error;
//     }
//   }
// };

import request from '@/services/apiService';

export default {
  postPointReport(id: any) {
    return request.post('/PointReportView/getlist', {cpId: id});
  },
  getPointReportId(id: any) {
    return request.get(`/PointReportView/getone/${id}`);
  },
  createPointReport(data: any) {
    return request.post(`/PointReport/created`, {data})
  }
};