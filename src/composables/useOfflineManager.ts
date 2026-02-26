import { ref, computed } from 'vue';
// 🚀 1. Bỏ import Network đi vì ta sẽ lấy mạng từ Vuex
import storage from '@/services/storage.service';
import { ImageService } from '@/services/image.service';
import PointReport from '@/api/PointReport';
import store from '@/composables/useVuex'; // 🚀 2. Import Vuex Store vào đây

interface PendingItem {
  id: number;
  url: string;
  data: any;           
  imageFiles: string[]; 
}

// 🚀 3. CHỈ CÒN LẠI 2 BIẾN NÀY LÀ GLOBAL (Bỏ hẳn isOnline và networkListener đi)
const pendingItems = ref<PendingItem[]>([]);
const isSyncing = ref(false);

export function useOfflineManager() {

  // --- Tải danh sách chờ từ Storage ---
  const loadPendingItems = async (): Promise<void> => {
    const data = await storage.get('offline_api_queue');
    pendingItems.value = (data as PendingItem[]) || [];
  };

  // --- Hàm gửi dữ liệu ---
  const sendData = async (url: string, data: any, imagesBase64: string[] = []): Promise<void> => {
    const id = Date.now();
    
    const imageFiles: string[] = [];
    for (const base64 of imagesBase64) {
      try {
        const fileName = await ImageService.saveImage(base64); 
        imageFiles.push(fileName);
      } catch (err) {
        console.error("Lỗi lưu ảnh vật lý:", err);
      }
    }

    const newItem: PendingItem = { id, url, data, imageFiles };

    // 🚀 4. ĐIỂM ĂN TIỀN: LẤY TRẠNG THÁI MẠNG TRỰC TIẾP TỪ VUEX STORE
    if (store.state.isOnline) {
      try {
        await uploadToServer(newItem);
        for (const f of imageFiles) await ImageService.deleteImage(f);
      } catch (error) {
        console.warn("Gửi trực tiếp thất bại, chuyển vào hàng chờ...");
        await addToQueue(newItem);
      }
    } else {
      console.log("Đang offline, đã lưu vào hàng chờ.");
      await addToQueue(newItem);
    }
  };

  const addToQueue = async (item: PendingItem): Promise<void> => {
    const queue: PendingItem[] = await storage.get('offline_api_queue') || [];
    queue.push(item);
    await storage.set('offline_api_queue', queue);
    await loadPendingItems();

    const actualUser: any = store.state.dataUser;
    console.log(item);
    
    const mockReport = {
      prId: `offline_${Date.now()}`, // Tạo ID tạm thời
      cpId: item.data.cpId,
      cpName: item.data.cpName || item.data.cpCode,
      createdName: actualUser?.fullName || actualUser?.userName || 'Tôi (Đang Offline)',
      createdAt: item.data.scanAt,
      prHasProblem: item.data.prHasProblem,
      prNote: item.data.prNote,
      isOfflineMock: true // Cờ nhận biết để tô màu UI
    };

    store.commit('ADD_OFFLINE_REPORT', mockReport);
  };

  // --- Cơ chế đồng bộ ---
  const syncData = async (): Promise<void> => {
    // 🚀 5. CHECK MẠNG TỪ VUEX STORE
    if (isSyncing.value || !store.state.isOnline) return;

    isSyncing.value = true; 

    try {
      await loadPendingItems();
      
      if (pendingItems.value.length === 0) {
        isSyncing.value = false; 
        return;
      }

      const queue = [...pendingItems.value];
      
      for (const item of queue) {
        try {
          await uploadToServer(item);

          if (item.imageFiles && item.imageFiles.length > 0) {
            for (const fileName of item.imageFiles) {
              try {
                await ImageService.deleteImage(fileName);
              } catch (imgError) {}
            }
          }

          const currentQueue: PendingItem[] = await storage.get('offline_api_queue') || [];
          const updatedQueue = currentQueue.filter(q => q.id !== item.id);
          await storage.set('offline_api_queue', updatedQueue);
          pendingItems.value = updatedQueue;

        } catch (error) {
          console.error(`Đồng bộ thất bại cho item ${item.id}:`, error);
          break; 
        }
      }
    } catch (e) {
      console.error("Lỗi tổng quát trong tiến trình đồng bộ:", e);
    } finally {
      isSyncing.value = false; 
      await loadPendingItems(); 
    }
  };

  const uploadToServer = async (item: PendingItem): Promise<any> => {
    console.log(item.data);
    return await PointReport.createPointReport(item.data);
  };

  return { 
    // Trả về biến isOnline lấy từ Vuex để giao diện (nếu cần) xài chung luôn
    isOnline: computed(() => store.state.isOnline), 
    pendingItems, 
    sendData, 
    loadPendingItems, 
    syncData 
  };
}