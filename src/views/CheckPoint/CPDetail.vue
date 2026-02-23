<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ getPrIdData.cpCode }}.Detail #{{ getPrIdData.prId }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card>
        <ion-grid>
          <ion-row>
            <ion-col 
              :size="listImages.length === 1 ? '12' : listImages.length === 2 ? '6' : '4'" 
              size-md="2" 
              size-lg="2" 
              v-for="(img) in listImages" :key="img.url">
              <div class="thumbnail-wrapper" @click="openModal(img)" id="open-custom-dialog" expand="block">
                <ion-img :src="img.url" alt="picBase64"></ion-img>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-modal :is-open="isModalOpen" @didDismiss="closeModal" id="example-modal" ref="modal" trigger="open-custom-dialog">
          <div class="wrapper" v-if="selectedImage" insert>
            <ion-img :src="selectedImage.url"></ion-img>
          </div>
        </ion-modal>

        <ion-card-header>
          <ion-card-title>Area: {{ getPrIdData.areaName }}</ion-card-title>
          <ion-card-subtitle>Check Point: {{ getPrIdData.cpName }}</ion-card-subtitle>
          <ion-card-subtitle>User Name: {{ getPrIdData.createdName }}</ion-card-subtitle>
          <ion-card-subtitle>Date: {{ getPrIdData.createdAt }}</ion-card-subtitle>
        </ion-card-header>

        <ion-card-content>
          <ion-label>Note:</ion-label>
          <br>
          {{ getPrIdData.prNote }}
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
    IonHeader,
    IonToolbar,
    IonTitle,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonCol, 
    IonGrid, 
    IonRow,
    IonPage,
    IonContent,
    IonLabel,
    IonImg,
    IonModal,
} from '@ionic/vue'
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';

interface ImageItem {
  url: string;
  title?: string;
  description?: string;
}

interface CheckPointItem {
  prId: number;
  cpCode: string;
  reportImages: Array<{ priImage: string }>;
  [key: string]: any;
}

// Get Data RP ******
const store = useStore()
const route = useRoute();
const dataStoreRP = store.state.dataListCP
console.log(dataStoreRP);

const getPrIdData = dataStoreRP[0].find((item: CheckPointItem) => item.prId === Number(route.params.id))
//*********>

// Show Images ******
// Khai báo biến reactive để chứa chuỗi ảnh
const listImages = ref<ImageItem[]>([])

const loadImage = () => {
  // Giả sử đây là chuỗi base64 nhận được từ API (thường API trả về chuỗi thô)
  // const rawBase64 = '';
  for (const item of getPrIdData.reportImages) {
    listImages.value.push({ url: `data:image/png;base64,${item.priImage}` })
  }
  // QUAN TRỌNG: Phải ghép thêm header nếu chuỗi chưa có
  // Lưu ý loại ảnh: image/png hoặc image/jpeg tùy vào ảnh gốc của bạn
};

loadImage()
//**********>

const isModalOpen = ref(false);
const selectedImage = ref<ImageItem | null>(null);

const openModal = (img: ImageItem) => {
  selectedImage.value = img; // Lưu hình được chọn vào biến
  isModalOpen.value = true;  // Mở modal
};

const closeModal = () => {
  isModalOpen.value = false;
  // Reset lại selectedImage sau khi animation đóng kết thúc (tùy chọn)
  setTimeout(() => {
    selectedImage.value = null;
  }, 200);
};
</script>

<style scoped>
ion-col {
  background-color: #bff1d8;
  border: solid 1px #fff;
  color: black;
  text-align: center;
  align-items: center;
  justify-content: center;
}

ion-checkbox {
  --size: 32px;
  --checkbox-background-checked: #6815ec;
}

ion-checkbox::part(container) {
  border-radius: 6px;
  border: 2px solid #6815ec;
}

.thumbnail-wrapper {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  cursor: pointer;
}

ion-modal#example-modal {
  --width: fit-content;
  --min-width: 250px;
  --height: fit-content;
  --border-radius: 6px;
  --box-shadow: 0 28px 48px rgba(0, 0, 0, 0.4);
}

ion-modal#example-modal .wrapper {
  margin-bottom: 1px;
}
</style>