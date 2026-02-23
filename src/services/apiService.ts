import { CapacitorHttp, HttpResponse, HttpOptions } from '@capacitor/core';
import baseURLMixin from '@/mixins/baseURLMixin';

const baseURL: string = baseURLMixin.url;

// Định nghĩa các method hợp lệ theo CapacitorHttp
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const request = {
  /**
   * Hàm xử lý chung sử dụng CapacitorHttp.request
   */
  async send(method: HttpMethod, url: string, data: any = null): Promise<HttpResponse> {
    const options: HttpOptions = {
      url: `${baseURL}${url}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        // 'Connection': 'close' // Thường không cần thiết với CapacitorHttp trừ khi debug đặc biệt
      },
      data: data,
      
      /**
       * PHẦN FIX LỖI SSL & TIMEOUT
       * 'default': Kiểm tra chứng chỉ chuẩn (CA).
       * 'nocheck': Bỏ qua kiểm tra (Chỉ dùng cho môi trường Dev/Self-signed).
       */
      // webviewServerTrustMode: 'default',
      connectTimeout: 15000, // Tăng lên 15s để ổn định hơn trên mạng di động
      readTimeout: 15000
    };

    try {
      // Sử dụng hàm request duy nhất thay vì truy cập dynamic property
      const response = await CapacitorHttp.request(options);
      
      // CapacitorHttp không throw error khi status code >= 400 (giống fetch)
      // nên ta cần chủ động check status
      if (response.status >= 400) {
          console.error(`[API Error ${response.status}] ${method} ${url}`, response.data);
          throw response;
      }

      return response;
    } catch (error) {
      console.error(`[Network/SSL Error] ${method} ${url}:`, error);
      throw error;
    }
  },

  // Các hàm rút gọn với typing rõ ràng
  get(url: string) { 
    return this.send('GET', url); 
  },
  
  post(url: string, data?: any) { 
    return this.send('POST', url, data); 
  },
  
  put(url: string, data?: any) { 
    return this.send('PUT', url, data); 
  },
  
  delete(url: string) { 
    return this.send('DELETE', url); 
  },

  patch(url: string, data?: any) {
    return this.send('PATCH', url, data);
  }
};

export default request;