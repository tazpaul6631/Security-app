<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/checkpoint"></ion-back-button>
        </ion-buttons>
        <ion-title>
          {{ getPrIdData?.cpCode || 'Chi tiết' }} #{{ getPrIdData?.prId || '' }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!getPrIdData" class="ion-padding ion-text-center">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Đang tải chi tiết...</p>
      </div>

      <ion-card v-else>
        <ion-grid class="image-grid" v-if="listImages.length > 0">
          <ion-row>
            <ion-col 
              v-for="(img, index) in listImages" 
              :key="index"
              size="4" 
              size-md="2">
              <div class="thumbnail-wrapper" @click="openModal(img)">
                <ion-img :src="img.url" class="thumb-img"></ion-img>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-modal :is-open="isModalOpen" @didDismiss="closeModal" class="image-modal">
          <div class="modal-wrapper" v-if="selectedImage" @click="closeModal">
            <ion-img :src="selectedImage.url"></ion-img>
          </div>
        </ion-modal>

        <ion-card-header>
          <div class="status-badge" :class="getPrIdData.prHasProblem ? 'problem' : 'normal'">
            {{ getPrIdData.prHasProblem ? 'Có vấn đề' : 'Bình thường' }}
          </div>
          <ion-card-title>Khu vực: {{ getPrIdData.areaName }}</ion-card-title>
          <ion-card-subtitle>Vị trí: {{ getPrIdData.cpName }}</ion-card-subtitle>
        </ion-card-header>

        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>
                <h2>{{ getPrIdData.createdName }}</h2>
              </ion-label>
              <ion-label>
                <h3>{{ formatDate(getPrIdData.createdAt) }}</h3>
              </ion-label>
            </ion-item>
            <ion-item class="note-item">
              <ion-label>
                <h3>Ghi chú</h3>
                <div class="note-content">{{ getPrIdData.prNote || 'Không có ghi chú' }}</div>
              </ion-label>
            </ion-item>
            <ion-item v-if="getPrIdData.cpDescription">
              <ion-label>
                <h3>Mô tả Checkpoint</h3>
                <p class="description-text">{{ getPrIdData.cpDescription }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
    IonHeader, IonToolbar, IonTitle, IonCard, IonCardHeader, IonCardTitle,
    IonCardSubtitle, IonCardContent, IonCol, IonGrid, IonRow, IonPage,
    IonContent, IonLabel, IonImg, IonModal, IonButtons, IonBackButton,
    IonSpinner, IonList, IonItem
} from '@ionic/vue'
import { ref, computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

// State cho Modal ảnh
const isModalOpen = ref(false);
const selectedImage = ref<{url: string} | null>(null);

/**
 * Lấy data từ Store dựa trên ID từ URL
 * Sử dụng computed để tự động cập nhật nếu Store thay đổi
 */
const getPrIdData = computed(() => {
  const dataStoreRP = store.state.currentCheckpoint;
  console.log(dataStoreRP);
  
  return dataStoreRP.data;
});

/**
 * Tự động chuyển đổi reportImages sang định dạng Base64 để hiển thị
 */
const listImages = computed(() => {
  const data = getPrIdData.value;
  if (data && data.reportImages && Array.isArray(data.reportImages)) {
    return data.reportImages.map((item: any) => ({
      // Kiểm tra nếu chuỗi đã có prefix data:image thì giữ nguyên, ngược lại thì thêm vào
      url: item.priImage?.startsWith('data:image') 
           ? item.priImage 
           : `data:image/jpeg;base64,${item.priImage}`
    }));
  }
  return [];
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const openModal = (img: {url: string}) => {
  selectedImage.value = img;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};
</script>

<style scoped>
.image-grid {
  padding: 10px;
}

.thumbnail-wrapper {
  aspect-ratio: 1/1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  width: fit-content;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.status-badge.normal {
  background: #d4fcc7;
  color: #1e4620;
}

.status-badge.problem {
  background: #ffdada;
  color: #7a1b1b;
}

.note-content {
  background: #f4f5f8;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
  color: #444;
  font-style: italic;
  white-space: pre-wrap;
}

.description-text {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
}

.image-modal {
  --width: 100%;
  --height: 100%;
  --background: rgba(0, 0, 0, 0.9);
}

.modal-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.modal-wrapper ion-img {
  max-width: 100%;
  max-height: 90vh;
}

h3 {
  font-weight: 600;
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 4px;
}
</style>