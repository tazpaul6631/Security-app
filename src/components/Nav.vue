<template>
  <ion-page>
    <ion-menu content-id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-menu-toggle>
            <ion-item :button="true" router-link="/home">
              <ion-label>Home</ion-label>
            </ion-item>
          </ion-menu-toggle>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-accordion-group expand="inset">
          <ion-accordion v-for="([ parent, children ]) in datalistNav" :key="parent">
            <ion-item slot="header" color="rose" >
              <ion-label>{{ parent }}</ion-label>
            </ion-item>
            <ion-menu-toggle slot="content" v-for="([value, id]) in children">
              <ion-item :button="true" @click="handleNavLink(id)" :key="value">
                <ion-label>{{ value }}</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </ion-accordion>
        </ion-accordion-group>
      </ion-content>
    </ion-menu>

    <ion-page id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons>
          <ion-label color="medium">SECURITY<ion-label color="danger">APP</ion-label></ion-label>
          <ion-button slot="end" color="rose" @click="handleLogout">Logout</ion-button>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-router-outlet></ion-router-outlet>
      </ion-content>

      <ion-footer>  
        <ion-toolbar>
          <ion-grid>
            <ion-row>
              <ion-col class="icon-footer" size="12" size-md="4" size-lg="2">
                <ion-buttons>
                  <ion-button>
                    <ion-fab-button @click="startScanning()">
                      <ion-icon :icon="qrCodeOutline"></ion-icon>
                    </ion-fab-button>
                  </ion-button>
                </ion-buttons>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-toolbar>
      </ion-footer>
    </ion-page>
  </ion-page>
</template>

<script setup lang="ts">
  import { 
    IonButtons, 
    IonButton, 
    IonContent, 
    IonHeader, 
    IonMenu, 
    IonMenuToggle, 
    IonMenuButton, 
    IonPage, 
    IonToolbar, 
    IonAccordion, 
    IonAccordionGroup, 
    IonItem, 
    IonLabel,
    IonRouterOutlet,
    IonFooter,
    IonIcon,
    IonFabButton,
    alertController,
    IonGrid,
    IonRow,
    IonCol
   } from '@ionic/vue';
  import { onMounted, reactive, ref, watch } from 'vue'; 
  import { qrCodeOutline } from 'ionicons/icons';
  import { useRoute } from 'vue-router';
  import { Barcode, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
  import AreaBU from '@/api/AreaBU';
  import router from '@/router';
  import PointReport from '@/api/PointReport';
  import { useStore } from 'vuex'
  import CheckPointScanQr from '@/api/CheckPointScanQr'

const route = useRoute();

const datalistNav = reactive<[string, [string, string][]][]>([]);

const pageEdit = ref(true);
const isLoading = ref(false);  
const error = ref(null);
const listScanQr = reactive({
  cpwId: '',
  cpwCode: ''
})

watch(
  () => route.name,
  () => {
  console.log('nav');
  console.log(route.name === 'checkpoint-detail');
  
  pageEdit.value = route.name === 'checkpoint-detail' ? true : false;
  console.log(pageEdit.value);
  
})
    
const barcodeList = ref<Barcode | null>(null);

const startScanning = async () => {
  
  const granted = await requestPermissions();
  console.log(1, granted);
  
  if (!granted) {
    presentAlert('Permission denied', 'Please grant camera permission to use the barcode scanner.');
    return;
  }

  const { barcodes } = await BarcodeScanner.scan();
  barcodeList.value = barcodes[0]

  const urlString = barcodeList.value.rawValue
  if (urlString) {
    const url = new URL(urlString);

    // url.pathname sẽ là: "/checkpointview/scanqr/3/BU3-A01"
    const segments = url.pathname.split('/'); 

    // Mảng segments sẽ là: ["", "checkpointview", "scanqr", "3", "BU3-A01"]
    listScanQr.cpwId = segments[3];   // Lấy id
    listScanQr.cpwCode = segments[4]; // Lấy code
  }

  try {
    const responseQR = await CheckPointScanQr.getCheckPointScanQr(listScanQr);
    store.commit('SET_DATASCANQR', responseQR.data)
    
    router.replace({
      path: '/checkpoint/create'
    })
  } catch (err) {
    console.error('API Error:', err);
    error.value = (err as any).response?.data?.message || 'Không thể lấy dữ liệu!';
  } finally {
    isLoading.value = false;
  }
}

const requestPermissions = async () => {
  const { camera } = await BarcodeScanner.requestPermissions();
  console.log(2, camera);
  
  return camera === 'granted' || camera === 'limited';
}

const presentAlert = async (hdr: string, msg: string) => {
  const alert = await alertController.create({
    header: hdr,
    message: msg,
    buttons: ['OK'],
  });
  await alert.present();
}     

// Gọi Api Menu ****
const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const responseBU = await AreaBU.postAreaBU();
    handleLoadNavParent(responseBU.data);
  } catch (err) {
    console.error('API Error:', err);
    error.value = (err as any).response?.data?.message || 'Không thể lấy dữ liệu!';
  } finally {
    isLoading.value = false;
  }
};

function handleLoadNavParent(data: any[]) {
  for (const item of data) {
    datalistNav.push([item.areaCode, [...item.checkPoints.map((cp: any) => [cp.cpCode, cp.cpId])]]);
  }
}

onMounted(() => {
  fetchData();
});
// ******>

// Gọi Api CheckPoint ***
let dataGet = reactive([] as any[])
const store = useStore();

const fetchDataCheckPoint = async (id: any) => {
  isLoading.value = true
  error.value = null
  dataGet = []
  try {
    const responseBU = await PointReport.postPointReport(id)
    dataGet.push(responseBU.data)
    console.log(dataGet);
    store.commit('SET_DATACP', dataGet)
  } catch (err) {
    console.error('API Error:', err)
    error.value = (err as any).response?.data?.message || 'Không thể lấy dữ liệu!'
  } finally {
    isLoading.value = false
  }
};

const handleNavLink = (id: string) => {
  fetchDataCheckPoint(id)
  router.replace({
    path: `/checkpoint`
  });
}
// *****>

const handleLogout = () => {
  // 1. Xóa token
  localStorage.removeItem('user_token');
  
  // 2. Quay về trang login
  router.replace('/login');
};
</script>

<style>
:root {
  --ion-color-rose: #d4fcc7;
  --ion-color-rose-rgb: 254, 205, 211;
  --ion-color-rose-contrast: #000000;
  --ion-color-rose-contrast-rgb: 0, 0, 0;
  --ion-color-rose-shade: #d4fcc7;
  --ion-color-rose-tint: #d4fcc7;
}

.ion-color-rose {
  --ion-color-base: var(--ion-color-rose);
  --ion-color-base-rgb: var(--ion-color-rose-rgb);
  --ion-color-contrast: var(--ion-color-rose-contrast);
  --ion-color-contrast-rgb: var(--ion-color-rose-contrast-rgb);
  --ion-color-shade: var(--ion-color-rose-shade);
  --ion-color-tint: var(--ion-color-rose-tint);
}

div[slot='content'] {
  background: rgba(var(--ion-color-rose-rgb), 0.25);
}

.icon-footer {
  align-items: center;
  justify-items: center !important;
  justify-content: center;
  align-content: center;
}
</style>