<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/route"></ion-back-button>
        </ion-buttons>
        <ion-title>CheckPoint Create</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card class="inspection-grid-card" v-if="currentRoute">
        <ion-card-header>
          <ion-badge color="success" mode="ios" class="header-badge">Đang thực hiện</ion-badge>
          <div class="header-flex">
            <ion-card-title>{{ currentRoute?.routeName }}</ion-card-title>
          </div>
        </ion-card-header>

        <ion-card-content>
          <div class="points-grid">
            <div v-for="(point, idx) in currentRoute?.routeDetails" :key="point.rdId" class="grid-item-wrapper">

              <div class="point-node" :class="{
                'done': point.status === 1,
                'current': isPointActive(point.cpId),
                'next-step': isCurrentStep(idx)
              }">
                <div class="mini-thumb">
                  <img :src="`https://picsum.photos/200?sig=${point.cpId}`" />
                  <div v-if="point.status === 1" class="check-icon">
                    <ion-icon :icon="checkmark"></ion-icon>
                  </div>
                </div>
                <span class="point-number">{{ idx + 1 }}</span>
              </div>

              <div v-if="(idx + 1) % 4 !== 0 && idx !== (currentRoute?.routeDetails?.length ?? 0) - 1" class="h-line"
                :class="{ 'active': point.status === 1 }">
              </div>

              <div class="point-label">{{ point.cpName }}</div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <div v-else-if="isReady" class="ion-padding ion-text-center">
        <p>Không tìm thấy thông tin lộ trình phù hợp.</p>
      </div>

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

            <!-- <ion-item>
              <ion-textarea label="Ghi chú thêm" label-placement="floating" v-model="formData.prNote"
                :rows="3"></ion-textarea>
            </ion-item> -->

            <div v-if="formData.prHasProblem">
              <ion-item>
                <ion-card-header class="pad-0">
                  <ion-label>Chọn nội dung tuần tra</ion-label>
                  <ion-button fill="outline" @click="openCategoryModal = true">
                    Tình trạng ({{ selectedPcccLabels.length + tempNoteList.length }})
                  </ion-button>
                </ion-card-header>

                <ion-modal :is-open="openCategoryModal" @didDismiss="openCategoryModal = false">
                  <ion-header>
                    <ion-toolbar class="toolbar-modal">
                      <ion-title>CHỌN HẠNG MỤC</ion-title>
                      <ion-buttons slot="end">
                        <ion-button @click="openCategoryModal = false">Đóng</ion-button>
                      </ion-buttons>
                    </ion-toolbar>
                  </ion-header>

                  <ion-content class="ion-padding">
                    <ion-accordion-group>
                      <ion-accordion v-for="cat in apiCategories" :key="cat.rncId" :value="cat.rncName">
                        <ion-item slot="header" color="light">
                          <ion-label>{{ cat.rncName }}</ion-label>
                        </ion-item>
                        <div class="ion-padding" slot="content">
                          <ion-list>
                            <ion-item v-for="sub in cat.childs" :key="sub.rncId" button detail
                              @click="selectSubCategory(sub)">
                              <ion-label>
                                <h2>{{ sub.rncName }}</h2>
                                <p>Bấm để chọn tình trạng chi tiết</p>
                              </ion-label>
                            </ion-item>
                          </ion-list>
                        </div>
                      </ion-accordion>
                    </ion-accordion-group>

                    <div class="ion-padding-top" v-if="selectedPcccLabels.length > 0">
                      <ion-label color="medium">
                        <p>Đã chọn:</p>
                      </ion-label>
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px;">
                        <ion-chip v-for="(label, idx) in selectedPcccLabels" :key="idx" color="primary">
                          {{ label }}
                          <ion-icon :icon="trash" @click.stop="removeItem(label)"></ion-icon>
                        </ion-chip>

                        <template v-if="tempNoteList.length > 0">
                          <ion-chip v-for="(note, nIdx) in tempNoteList" :key="'note-' + nIdx" color="warning">
                            <ion-label>Note: {{ note }}</ion-label>
                            <ion-icon :icon="trash" @click.stop="clearNote(nIdx)"></ion-icon>
                          </ion-chip>
                        </template>
                      </div>
                    </div>
                  </ion-content>
                </ion-modal>

                <ion-modal :is-open="openDetailModal" @didDismiss="openDetailModal = false" initial-breakpoint="0.7">
                  <ion-header>
                    <ion-toolbar>
                      <ion-title>{{ selectedSubCategory?.rncName || 'CHI TIẾT' }}</ion-title>
                      <ion-buttons slot="end">
                        <ion-button @click="openDetailModal = false">Xong</ion-button>
                      </ion-buttons>
                    </ion-toolbar>
                  </ion-header>
                  <ion-content class="ion-padding">
                    <ion-list>
                      <ion-item>
                        <ion-select label="Lỗi phát hiện" label-placement="floating" :multiple="true"
                          v-model="selectedValues" @ionChange="handleDetailChange($event)"
                          placeholder="Chọn các lỗi...">

                          <ion-select-option v-for="issue in currentIssues" :key="issue.rncId" :value="issue.rncName">
                            {{ issue.rncName }}
                          </ion-select-option>

                          <ion-select-option value="note">Ghi chú khác...</ion-select-option>
                        </ion-select>
                      </ion-item>
                    </ion-list>
                  </ion-content>
                </ion-modal>

                <ion-modal :is-open="openNoteModal" @didDismiss="openNoteModal = false" initial-breakpoint="0.5">
                  <ion-content class="ion-padding">
                    <ion-textarea label="Nhập ghi chú" label-placement="floating" fill="outline" v-model="tempNoteInput"
                      :rows="4"></ion-textarea>
                    <ion-button expand="block" class="ion-margin-top" @click="confirmNote">Xác nhận</ion-button>
                  </ion-content>
                </ion-modal>
              </ion-item>


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
          <ion-item-sliding v-for="item in displayItems" :key="item.id">
            <ion-item>
              <ion-thumbnail slot="start" class="pending-thumb">
                <img v-if="item.thumb" :src="item.thumb" />
                <div v-else class="no-image-placeholder">
                  <ion-icon :icon="cloudOfflineOutline" color="warning"></ion-icon>
                </div>
              </ion-thumbnail>

              <ion-label>
                <h2 class="checkpoint-name">{{ getCheckpointName(item.data?.cpId) }}</h2>
                <p class="status-info">
                  <ion-badge color="warning" mode="ios">Chờ đồng bộ</ion-badge>
                  <span class="image-count">
                    <ion-icon :icon="images"></ion-icon> {{ item.imageFiles?.length || 0 }} ảnh
                  </span>
                </p>
                <p class="time-stamp">{{ formatDate(item.id) }}</p>
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
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonTextarea,
  IonCheckbox, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonGrid, IonRow, IonCol, IonImg, IonLabel, IonItemSliding,
  IonItemOptions, IonItemOption, IonListHeader, loadingController, onIonViewWillEnter,
  IonSpinner, toastController, IonBadge, IonThumbnail, IonBackButton, IonButtons,
  IonSelect, IonModal, IonSelectOption, IonChip, IonAccordion, IonAccordionGroup
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
import { checkmark } from 'ionicons/icons';

const store = useStore();
const isReady = ref(false);

///////////////////////////////////
interface RouteDetail {
  rdId: number | string;
  cpId: number | string;
  cpName: string;
  status: number;
}

interface Route {
  routeId: string | number;
  routeName: string;
  routeDetails: RouteDetail[];
}
///////////////////////////////////

///////////////////////////////////////
// 1. Lấy ID route từ store
const currentRouteId = computed(() => store.state.routeId);

// 2. Tìm Route hiện tại
const currentRoute = computed<Route | null>(() => {
  const routes = store.state.dataListRoute || [];
  return routes.find((r: any) => r.routeId === currentRouteId.value) || null;
});

// 3. Highlight điểm vừa quét (Dùng cho class 'current')
const isPointActive = (cpId: number | string) => {
  if (!dataScanQr.value) return false;
  return String(cpId) === String(dataScanQr.value.cpId);
};

// 4. Kiểm tra điểm hiện tại cần làm (Dùng nếu bạn muốn highlight điểm TIẾP THEO)
const isCurrentStep = (index: number): boolean => {
  const details = currentRoute.value?.routeDetails;
  if (!details) return false;
  const firstIncomplete = details.findIndex((p: RouteDetail) => p.status !== 1);
  return index === firstIncomplete;
};

// Hàm tìm tên checkpoint dựa trên cpId
const getCheckpointName = (cpId: string) => {
  if (!cpId || !currentRoute.value?.routeDetails) return 'Không xác định';

  // Tìm trong danh sách chi tiết của lộ trình hiện tại
  const checkpoint = currentRoute.value.routeDetails.find(
    (cp: any) => String(cp.cpId) === String(cpId)
  );

  return checkpoint ? checkpoint.cpName : 'Checkpoint không tồn tại';
};
////////////////////////////////////////////////////

//////////////////////////////////////////////////////
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
////////////////////////////////////////////////////

////////////////////////////////////////////
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
    duration: 5000,
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
/////////////////////////////////////////////////

// ==========================================
// 2. STATE & DỮ LIỆU CỦA MANAGER (Giữ nguyên)
// ==========================================
const { sendData, pendingItems, loadPendingItems, syncData, isSyncing } = useOfflineManager();

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
/////////////////////////////////////////////////////

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
/////////////////////////////////////////////////////////////////

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

    const currentTime_scanQr = await storageService.get('currentTime_scanqr')

    const formSubmitData = {
      createdAt: currentTimeString,
      prHasProblem: formData.prHasProblem,
      prNote: formData.prNote,
      cpId: dataScanQr.value.cpId,
      createdBy: userId,
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

    if (!isSyncing) await showToast('Đã lưu dữ liệu thành công!', 'success');

    router.replace({ path: '/home' })
  } catch (error) {
    await loading.dismiss();
    console.error("Gửi dữ liệu thất bại:", error);
    await showToast('Có lỗi xảy ra khi lưu dữ liệu', 'danger');
  }
};

///////////////////////////////////////////////
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
////////////////////////////////////////////////////////

////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////

// Xử lý selected note
/////////////////////////////////////////////
onIonViewWillEnter(() => {
  formData.prNote = '';
  formData.prHasProblem = false;
  photos.value = [];

  // THÊM 2 DÒNG NÀY ĐỂ RESET DỮ LIỆU CHỌN
  allSelectedMap.value = {};
  tempNoteList.value = [];
  selectedValues.value = [];
});

// --- 1. ĐỊNH NGHĨA INTERFACE (Bổ sung để chặt chẽ) ---
interface ReportNode {
  rncId: number | string; // Chấp nhận cả số và chuỗi
  rncName: string;
  childs?: ReportNode[]; // Dấu ? để tránh lỗi nếu childs bị null/undefined
  [key: string]: any;    // Cho phép các trường phụ khác từ API
}

// --- 2. STATE & LOGIC (Đã dọn dẹp dư thừa) ---
const apiCategories = ref<ReportNode[]>([]);
const selectedSubCategory = ref<ReportNode | null>(null);

const openCategoryModal = ref(false);
const openDetailModal = ref(false);
const openNoteModal = ref(false);

const selectedValues = ref<string[]>([]);
const allSelectedMap = ref<Record<string, string[]>>({});
const tempNoteInput = ref('');
const tempNoteList = ref<string[]>([]);

// Computed lấy danh sách lỗi cấp 3
const currentIssues = computed(() => selectedSubCategory.value?.childs || []);

// Xử lý chọn hạng mục con (Cấp 2)
const selectedPcccLabels = computed(() => {
  // Gom tất cả values từ Object Map thành 1 Array phẳng để hiển thị Chip
  const labels: string[] = [];
  Object.values(allSelectedMap.value).forEach(values => {
    values.forEach(v => {
      if (v !== 'note') labels.push(v);
    });
  });
  return labels;
});

const selectSubCategory = (sub: ReportNode) => {
  selectedSubCategory.value = sub;
  // Nạp lại dữ liệu cũ đã chọn của hạng mục này (nếu có) vào biến tạm của Modal
  selectedValues.value = allSelectedMap.value[sub.rncId] || [];
  openDetailModal.value = true;
};

// Xử lý khi chọn lỗi (Cấp 3)
const handleDetailChange = (event: any) => {
  const values = event.detail.value;
  const subId = selectedSubCategory.value?.rncId;

  if (subId) {
    // Lưu cộng dồn vào Map theo ID hạng mục
    if (values.length > 0) {
      allSelectedMap.value[subId] = values;
    } else {
      delete allSelectedMap.value[subId];
    }
  }

  if (values.includes('note')) {
    openNoteModal.value = true;
  }
  syncToMainForm();
};

const confirmNote = () => {
  if (tempNoteInput.value.trim()) {
    // Thêm ghi chú mới vào mảng
    tempNoteList.value.push(tempNoteInput.value.trim());

    // Reset ô nhập liệu cho lần sau
    tempNoteInput.value = '';
  }
  openNoteModal.value = false;
  syncToMainForm();
};

const removeItem = (labelToRemove: string) => {
  for (const subId in allSelectedMap.value) {
    if (allSelectedMap.value[subId].includes(labelToRemove)) {
      allSelectedMap.value[subId] = allSelectedMap.value[subId].filter(v => v !== labelToRemove);

      // Cập nhật lại selectedValues nếu đang mở đúng modal của hạng mục đó
      if (selectedSubCategory.value?.rncId == subId) {
        selectedValues.value = [...allSelectedMap.value[subId]];
      }

      if (allSelectedMap.value[subId].length === 0) {
        delete allSelectedMap.value[subId];
      }
      break;
    }
  }
  syncToMainForm();
};

// Sửa lại hàm clearNote để nhận vào index cần xóa
const clearNote = (index: number) => {
  // 1. Xóa phần tử khỏi mảng ghi chú
  tempNoteList.value.splice(index, 1);

  // 2. Nếu sau khi xóa mà không còn ghi chú nào, 
  // hãy bỏ chọn 'note' trong dropdown (nếu muốn)
  if (tempNoteList.value.length === 0) {
    selectedValues.value = selectedValues.value.filter(v => v !== 'note');
  }

  // 3. Cập nhật lại chuỗi formData.prNote
  syncToMainForm();
};

const syncToMainForm = () => {
  let combined = [...selectedPcccLabels.value];

  if (tempNoteList.value.length > 0) {
    // Gom các note lại, phân cách bằng dấu phẩy
    const allNotesString = tempNoteList.value.join(', ');
    combined.push(`${allNotesString}`);
  }

  // Phân cách các hạng mục lớn bằng dấu chấm phẩy
  formData.prNote = combined.join(', ');
  console.log(formData.prNote);
};

onMounted(async () => {
  // ... các bước hiện tại của bạn ...

  // BƯỚC 4: Gán dữ liệu danh mục từ Store vào ref
  const categoryData = store.state.dataReportNoteCategory;

  if (categoryData) {
    // Nếu dữ liệu trả về nằm trong một thuộc tính .data (thường thấy ở API)
    // bạn hãy kiểm tra xem nó là categoryData hay categoryData.data
    apiCategories.value = Array.isArray(categoryData) ? categoryData : (categoryData.data || []);

    console.log('Đã gán dữ liệu vào apiCategories:', apiCategories.value);
  } else {
    console.warn('Dữ liệu dataReportNoteCategory trong store đang trống');
  }

  isReady.value = true;
});
/////////////////////////////////////////////
</script>

<style scoped>
ion-toolbar {
  padding: 0 !important;
}

.toolbar-modal {
  padding-top: var(--ion-safe-area-top, 0) !important;
}

.pad-0 {
  padding: 0;
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

.pending-thumb {
  --size: 56px;
  --border-radius: 8px;
  margin-right: 12px;
}

.pending-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff4e5;
  border-radius: 8px;
}

.checkpoint-name {
  font-weight: bold;
  font-size: 1rem;
  color: #333;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.image-count {
  font-size: 0.85rem;
  color: #666;
  display: flex;
  align-items: center;
}

.time-stamp {
  font-size: 0.8rem;
  color: #999;
}

/** */
.inspection-grid-card {
  margin: 10px;
  border-radius: 12px;
}

.header-badge {
  padding: 13px;
  font-size: 17px;
  margin-bottom: 15px;
}

.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.points-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  /* Chia 4 cột cố định */
  gap: 15px 5px;
  /* Khoảng cách giữa các hàng và cột */
  padding: 10px 0;
}

.grid-item-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.point-node {
  width: 45px;
  height: 45px;
  position: relative;
  border-radius: 10px;
  padding: 2px;
  border: 2px solid #ddd;
  transition: all 0.3s;
}

.point-node.done {
  border-color: var(--ion-color-success);
}

.point-node.current {
  border-color: var(--ion-color-primary);
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(56, 128, 255, 0.4);
}

.mini-thumb {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.mini-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.7;
}

.point-node.done img {
  opacity: 1;
}

.check-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 50%;
  color: var(--ion-color-success);
  display: flex;
  font-size: 16px;
}

.point-number {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: #666;
  color: white;
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 10px;
  border: 1px solid white;
}

.point-node.current .point-number {
  background: var(--ion-color-primary);
}

.h-line {
  position: absolute;
  top: 22px;
  right: -25%;
  width: 40%;
  height: 2px;
  background: #eee;
  z-index: 0;
}

.h-line.active {
  background: var(--ion-color-success);
}

.point-label {
  overflow-wrap: break-word;
  margin-top: 8px;
  font-size: 0.65rem;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 60px;
}

/** */
</style>