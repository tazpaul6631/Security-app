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
//   postUserValidate(loginDetail) {
//     return apiClient.post(`${apiClient.defaults.baseURL}/User/validate`,
//         {
//             userCode: loginDetail.userCode,
//             userPassword: loginDetail.userPassword
//         }
//     );
//   }
// };

// import { CapacitorHttp } from '@capacitor/core';

// const baseURL = baseURLMixin.url;

// export default {
//   async postUserValidate(loginDetail) {
//     const options = {
//       url: `${baseURL}/User/validate`,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       data: {
//         userCode: loginDetail.userCode,
//         userPassword: loginDetail.userPassword
//       },
//       // Capacitor Http không dùng 'timeout' trực tiếp trong options như Axios 
//       // nhưng mặc định nó xử lý khá tốt theo cấu hình hệ thống.
//     };

//     try {
//       // Sử dụng CapacitorHttp thay cho axios.post
//       const response = await CapacitorHttp.post(options);
      
//       /**
//        * Lưu ý: CapacitorHttp trả về object có dạng:
//        * { data: ..., status: 200, headers: ... }
//        * Khá giống Axios nên bạn có thể giữ nguyên logic xử lý kết quả ở phía sau.
//        */
//       return response; 
//     } catch (error) {
//       console.error('Lỗi kết nối Native HTTP:', error);
//       throw error;
//     }
//   }
// };

import request from '@/services/apiService';

export default {
  postUserValidate(loginDetail: any) {
    return request.post(`/User/validate/`, 
      {
        userCode: loginDetail.userCode,
        userPassword: loginDetail.userPassword
      }
    );
  }
};