<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>CheckPoint Create</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="isReady">
        <ion-card>
          <ion-grid>
            <ion-row>
              <ion-col size="7">
                <ion-card-header>
                  <ion-card-title>
                    {{ dataScanQr?.areaCode }} - {{ dataScanQr?.areaName }}
                  </ion-card-title>
                  <ion-card-subtitle>
                    {{ dataScanQr?.cpCode }} <br>{{ dataScanQr?.cpName }}
                  </ion-card-subtitle>
                </ion-card-header>
              </ion-col>
              <ion-col size="5">
                <ion-card v-if="listImages.length > 0">
                  <ion-img class="full-screen-qr" alt="picbas64" :src="listImages[0].url" />
                </ion-card>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col>
                <ion-card-content>
                  {{ dataScanQr?.cpDescription }}
                </ion-card-content>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card>

        <ion-card>
          <ion-card-content>
            <ion-item>
              <ion-checkbox v-model="formData.prHasProblem" @click="handleChecked">
                Chọn nếu có vấn đề
              </ion-checkbox>
            </ion-item>

            <ion-item>
              <ion-textarea label="Ghi chú thêm" label-placement="floating" v-model="formData.prNote"
                :rows="3"></ion-textarea>
            </ion-item>

            <div v-if="formData.prHasProblem">
              <ion-row class="ion-margin-bottom">
                <ion-col>
                  <ion-button expand="block" @click="addPhoto">
                    <ion-icon slot="start" :icon="camera"></ion-icon>
                    photo
                  </ion-button>
                </ion-col>

                <ion-col>
                  <ion-button expand="block" @click="pickMultipleImages">
                    <ion-icon slot="start" :icon="images"></ion-icon>
                    images
                  </ion-button>
                </ion-col>
              </ion-row>

              <ion-grid v-if="photos.length > 0">
                <ion-row>
                  <ion-col size="6" size-md="4" v-for="(photo, index) in photos" :key="index">
                    <div class="image-container">
                      <ion-img :src="photo.preview" class="thumb-img"></ion-img>

                      <div class="delete-btn" @click="removePhoto(index)">
                        <ion-icon :icon="trash"></ion-icon>
                      </div>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </div>

            <ion-button expand="block" color="success" class="ion-margin-top" @click="handleSubmit">
              <ion-icon slot="start" :icon="sendOutline"></ion-icon>
              Gửi dữ liệu
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>

      <div v-else class="ion-text-center ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Đang đồng bộ dữ liệu...</p>
      </div>

      <div v-if="pendingItems.length > 0" class="ion-margin-top">
        <ion-list-header>
          <ion-label>Đang chờ đồng bộ ({{ pendingItems?.length }})</ion-label>
          <ion-button @click="syncData">Thử lại ngay</ion-button>
        </ion-list-header>

        <ion-list lines="full">
          <ion-item-sliding v-for="item in pendingItems" :key="item.id">
            <ion-item>
              <ion-icon slot="start" :icon="cloudOfflineOutline" color="warning"></ion-icon>
              <ion-label>
                <h2>{{ item.data.note || 'Không có tiêu đề' }}</h2>
                <p>{{ item.imageFiles?.length }} hình ảnh - {{ formatDate(item.id) }}</p>
              </ion-label>
            </ion-item>

            <ion-item-options side="end">
              <ion-item-option color="danger" @click="deleteItem(item.id)">
                <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonTextarea, IonCheckbox, IonButton, IonIcon, IonCard,
  IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonImg, IonLabel, IonItemSliding, IonItemOptions, IonItemOption,
  IonListHeader, loadingController, onIonViewWillEnter, IonSpinner, toastController, IonButtons, IonBackButton,
} from '@ionic/vue';
import { sendOutline, camera, images, trash } from 'ionicons/icons';
import { Camera, CameraResultType, CameraDirection, CameraSource } from '@capacitor/camera';
import { useStore } from 'vuex';
import { cloudOfflineOutline, trashOutline } from 'ionicons/icons';
import { useOfflineManager } from '@/composables/useOfflineManager';
import storage from '@/services/storage.service';
import { ImageService } from '@/services/image.service';
import router from '@/router';
import storageService from '@/services/storage.service';

const store = useStore()
const isReady = ref(false) // biến để kiểm soát UI

// Bóc tách an toàn dữ liệu Checkpoint quét được từ QR
const dataScanQr = computed(() => {
  const rawData = store.state.dataScanQr;
  if (!rawData) return null;

  // 1. Nếu đây là cục dữ liệu phẳng (Offline)
  if (rawData.cpName) {
    return rawData;
  }

  // 2. Nếu API bọc trong data (Online)
  if (rawData.data && rawData.data.cpName) {
    return rawData.data;
  }

  // 3. Nếu API bọc trong data.data (Online)
  if (rawData.data && rawData.data.data && rawData.data.data.cpName) {
    return rawData.data.data;
  }

  // 4. Nếu API trả về Mảng (Array)
  if (Array.isArray(rawData) && rawData.length > 0) {
    return rawData[0];
  }
  if (rawData.data && Array.isArray(rawData.data) && rawData.data.length > 0) {
    return rawData.data[0];
  }

  // Trả về mặc định nếu không khớp mẫu nào ở trên
  return rawData;
});

// Dùng computed cho ảnh QR
const listImages = computed(() => {
  // Lấy dataScanQr.value (đã được bóc tách vỏ ở trên)
  const currentData = dataScanQr.value;

  if (currentData && currentData.cpQr) {
    return [{ url: `data:image/png;base64,${currentData.cpQr}` }];
  }
  return [];
});

onMounted(async () => {
  // BƯỚC 1: Khôi phục dữ liệu từ SQLite vào Vuex nếu lỡ F5
  if (!store.state.isHydrated) {
    await store.dispatch('initApp');
  }

  // BƯỚC 2: Load các dữ liệu báo cáo offline đang chờ đồng bộ
  await loadPendingItemsWithImages();

  // BƯỚC 3: Bật đèn xanh cho UI render
  isReady.value = true;
});

onIonViewWillEnter(() => {
  formData.prNote = '';
  formData.prHasProblem = false;
  photos.value = []; // Quét sạch "ảnh ma" từ lần quét trước
});

// Toast thông báo gửi submit
const showToast = async (message: string, color: string = 'success') => {
  const toast = await toastController.create({
    message: message,
    duration: 2000,
    color: color,
    position: 'top',
  });
  await toast.present();
};

// Khởi tạo state cho form
const formData = reactive({
  prHasProblem: false,
  createdAt: '',
  prNote: '',
  cpId: '',
  createdBy: '',
  scanAt: '',
  images: []
});

// Kiểm tra checked
const handleChecked = () => {
  if (!formData.prHasProblem) photos.value = []
}

// ==========================================
// 1. ĐỊNH NGHĨA TYPES & INTERFACES (Giữ nguyên)
// ==========================================
interface Photo {
  fileName: string;
  rawBase64: string;
  preview: string;
  [key: string]: any;
}

interface QueueItem {
  id: number | string;
  data?: any;
  note?: string;
  userId?: string;
  imageFiles?: string[];
  thumb?: string | null;
  isMock?: boolean;
}

// ==========================================
// 2. STATE & DỮ LIỆU CỦA MANAGER (Giữ nguyên)
// ==========================================
const { sendData, pendingItems, loadPendingItems, syncData } = useOfflineManager();

const photos = ref<Photo[]>([]);
const displayItems = ref<QueueItem[]>([]);

// ==========================================
// 3. CÁC HÀM TIỆN ÍCH (Giữ nguyên)
// ==========================================
const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

const formatDate = (timestamp: number | string): string => {
  return new Date(timestamp).toLocaleTimeString();
};

// ==========================================
// 4. LOGIC XỬ LÝ ẢNH (Giữ nguyên hoàn toàn)
// ==========================================
const pickMultipleImages = async (): Promise<void> => {
  try {
    const result = await Camera.pickImages({ quality: 80, limit: 10 });
    const loading = await loadingController.create({ message: 'Đang xử lý ảnh...', duration: 5000 });
    await loading.present();

    const processedPhotos: Photo[] = await Promise.all(result.photos.map(async (photo) => {
      const response = await fetch(photo.webPath as string);
      const blob = await response.blob();
      const fullBase64 = await convertBlobToBase64(blob);
      const rawBase64 = fullBase64.split(',')[1];
      const rawName = fullBase64.split('/')[1].split(';')[0];
      return { fileName: rawName, rawBase64: rawBase64, preview: fullBase64 };
    }));

    photos.value = [...photos.value, ...processedPhotos];
    await loading.dismiss();
  } catch (error) {
    console.error('Lỗi khi chọn ảnh:', error);
  }
};

const addPhoto = async (): Promise<void> => {
  try {
    const image = await Camera.getPhoto({
      quality: 60, width: 1024, height: 1024, allowEditing: false,
      resultType: CameraResultType.Uri, direction: CameraDirection.Rear, source: CameraSource.Camera
    });

    if (image.webPath) {
      photos.value.push({ fileName: image.format, rawBase64: '', preview: image.webPath });
    }
  } catch (error) {
    console.log('User cancelled or error:', error);
  }
};

const removePhoto = (index: number): void => {
  photos.value.splice(index, 1);
};

// ==========================================
// 5. LOGIC FORM VÀ DỮ LIỆU OFFLINE 
// ==========================================
const handleSubmit = async (): Promise<void> => {
  const now = new Date();
  const currentTimeString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);

  if (!dataScanQr.value?.cpId) {
    await showToast('Lỗi: Không tìm thấy dữ liệu Checkpoint', 'danger');
    return;
  }

  const loading = await loadingController.create({ message: 'Đang lưu...' });
  await loading.present();

  try {
    const mapImages = await Promise.all(photos.value.map(async (item) => {
      let base64Data = item.rawBase64;
      if (!base64Data && item.preview.startsWith('http')) {
        const response = await fetch(item.preview);
        const blob = await response.blob();
        const fullBase64 = await convertBlobToBase64(blob);
        base64Data = fullBase64.split(',')[1];
      }
      return { priImage: base64Data, priImageType: item.fileName };
    }));

    const base64ImagesOnly = mapImages.map(img => img.priImage);

    // LẤY USER NGAY LÚC SUBMIT TỪ VUEX (Bóc tách an toàn)
    const rawUser = store.state.dataUser;
    const actualUser = rawUser?.data ? rawUser.data : rawUser;
    const userId = actualUser?.userId || '';

    if (!userId) {
      console.warn("Cảnh báo: Không tìm thấy userId khi offline.");
      // Tùy logic nghiệp vụ, bạn có thể chặn submit hoặc vẫn cho lưu với userId rỗng
    }

    const currentTime_scanQr = await storageService.get('currentTime_scanqr')

    const formSubmitData = {
      createdAt: currentTimeString,
      prHasProblem: formData.prHasProblem,
      prNote: formData.prNote,
      cpId: dataScanQr.value.cpId,
      createdBy: userId, // Sử dụng userId đã lấy an toàn
      scanAt: currentTime_scanQr,
      images: formData.prHasProblem ? mapImages : []
    };

    await sendData(photos.value[0]?.preview, formSubmitData, base64ImagesOnly);

    // RESET FORM
    formData.prNote = '';
    formData.prHasProblem = false;
    photos.value = [];

    store.commit('SET_DATASCANQR', null);
    await storageService.remove('currentTime_scanqr');

    await loadPendingItemsWithImages();
    await loading.dismiss();
    await showToast('Đã lưu dữ liệu thành công!', 'success');

    router.replace({ path: '/home' })
  } catch (error) {
    await loading.dismiss();
    console.error("Gửi dữ liệu thất bại:", error);
    await showToast('Có lỗi xảy ra khi lưu dữ liệu', 'danger');
  }
};

const deleteItem = async (id: number | string): Promise<void> => {
  const currentQueue: QueueItem[] = await storage.get('offline_api_queue') || [];
  const itemToDelete = currentQueue.find(i => i.id === id);

  if (itemToDelete) {
    try {
      if (itemToDelete.imageFiles) {
        for (const fileName of itemToDelete.imageFiles) {
          await ImageService.deleteImage(fileName); // Xóa ảnh vật lý
        }
      }
    } catch (e) { console.error("Lỗi xóa file:", e); }

    // 1. Cập nhật SQLite (xóa khỏi hàng chờ)
    const updatedQueue = currentQueue.filter(i => i.id !== id);
    await storage.set('offline_api_queue', updatedQueue);

    // 2. Cập nhật UI hàng chờ đồng bộ
    await loadPendingItemsWithImages();

    // 3. QUAN TRỌNG: Cập nhật Vuex Store (Xóa dòng dữ liệu ảo)
    store.commit('REMOVE_OFFLINE_REPORT', id);
  }
};

const loadPendingItemsWithImages = async (): Promise<void> => {
  await loadPendingItems();
  const itemsWithUrls = await Promise.all(pendingItems.value.map(async (item: QueueItem) => {
    let thumb = null;
    if (item.imageFiles && item.imageFiles.length > 0) {
      thumb = await ImageService.getDisplayUrl(item.imageFiles[0]);
    }
    return { ...item, thumb };
  }));
  displayItems.value = [...itemsWithUrls];
};
</script>

<style scoped>
ion-toolbar {
  padding: 0 !important;
}

/*CSS thêm và chụp hình*/
ion-list-header {
  --background: #f4f5f8;
  border-radius: 8px;
}

.image-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  aspect-ratio: 1 / 1;
  /* Giữ khung hình vuông */
  background: #f0f0f0;
}

.thumb-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
  border-radius: 8px;
}

/* Nút xóa nằm góc trên phải */
.delete-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

/* */
</style>