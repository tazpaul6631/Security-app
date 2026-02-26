<template>
    <ion-page>
      <div v-if="syncStatus.isSyncing" class="sync-overlay">
            <div class="sync-box">
                <ion-text color="primary">
                    <h3>{{ syncStatus.message }}</h3>
                </ion-text>
                <ion-progress-bar :value="syncStatus.progress / 100" color="success"></ion-progress-bar>
                <p>{{ syncStatus.progress }}%</p>
            </div>
        </div>

        <div class="flex-content">
            <ion-card class="login-card">
                <ion-card-header>
                    <ion-card-title size="large">Login</ion-card-title>
                </ion-card-header>

                <ion-card-content>
                    <ion-input
                        v-model="loginDetail.userCode"
                        label="Username" 
                        label-placement="floating" 
                        fill="outline" 
                        type="email"
                        placeholder="Enter Username"
                        :clear-input="true"
                        class="ion-margin-bottom"
                        @ion-blur="markTouched"></ion-input>
                
                    <br>

                    <ion-input
                        v-model="loginDetail.userPassword"
                        label="Password" 
                        label-placement="floating" 
                        fill="outline" 
                        placeholder="Enter Password"
                        type="password"
                        @keyup.enter="handleLogin">
                        <ion-input-password-toggle slot="end"></ion-input-password-toggle>
                    </ion-input>
                    
                    <br>

                    <div v-if="errorMessage" style="color: red; text-align: center;">
                        {{ errorMessage }}
                    </div>


                    <ion-button 
                        :disabled="isButtonDisabled || isLoading"
                        @click="handleLogin" 
                        expand="block" 
                        color="success" 
                        class="ion-margin-top"
                    >
                        <ion-spinner v-if="isLoading" name="crescent"></ion-spinner>
                        <span v-else>Login</span>
                    </ion-button>
                </ion-card-content>
            </ion-card>
        </div>
    </ion-page>
</template>

<script setup lang="ts">
import { 
    IonCardHeader, IonCardTitle, IonButton, IonCard, IonInput, 
    IonInputPasswordToggle, IonCardContent, IonPage, IonLoading, 
    IonSpinner, IonProgressBar, IonText 
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { reactive, ref, computed } from 'vue';
import Login from '@/api/Login';
import { useStore } from 'vuex';
import storageService from '@/services/storage.service';
// Import thêm các API của bạn để truyền vào action sync
import AppSetting from '@/api/AppSetting';
import CheckPointScanQr from '@/api/CheckPointScanQr';
import MenuCategory from '@/api/MenuCategory';
import Role from '@/api/Role';
import RoleMenuCategory from '@/api/RoleMenuCategory';
import PointReport from '@/api/PointReport';
import AreaBU from '@/api/AreaBU';

const router = useRouter();
const store = useStore();

const errorMessage = ref('');
const isLoading = ref(false);

// Lấy trạng thái đồng bộ từ Vuex
const syncStatus = computed(() => ({
    progress: store.state.syncProgress,
    message: store.state.syncMessage,
    isSyncing: store.state.isSyncing
}));

const loginDetail = reactive({
    userCode: '',
    userPassword: '',
});

const isButtonDisabled = computed(() => {
    return !loginDetail.userCode.trim() || !loginDetail.userPassword.trim();
});

const markTouched = (event: any) => {
    event.target.classList.add('ion-touched');
};

const handleLogin = async () => {
    if (isButtonDisabled.value) return;

    isLoading.value = true;
    errorMessage.value = '';

    try {
        // BƯỚC 1: Xác thực tài khoản
        const responseBU = await Login.postUserValidate(loginDetail);
        const result = responseBU.data;
        console.log(result);
        
        if (result?.success && result.data) {
            const userData = result.data;
            
            // Lưu thông tin User cơ bản vào RAM và SQLite
            store.commit('SET_DATAUSER', userData);
            store.commit('SET_TOKEN', userData.userPassword);
            await storageService.set('user_data', userData);
            await storageService.set('user_token', userData.userPassword);

            // BƯỚC 2: Gọi Action đồng bộ (Pre-fetch dữ liệu offline)
            // Truyền mảng các hàm API theo đúng thứ tự nghĩa trong Store
            const apiList = {
                // app_settings: () => AppSetting.postAppSettings(),
                // roles: () => Role.postRole(),
                // users: () => Login.postUser(),
                // menu_categories: () => MenuCategory.postMenuCategory(),
                // role_menu_mapping: () => RoleMenuCategory.postRoleMenuCategory(),
                checkpoints: () => CheckPointScanQr.postCheckPointView(),
                checkpoints_id: () => PointReport.postPointReportView(),
                area_bu: () => AreaBU.postAreaBU(),
            };

            await store.dispatch('syncAllData', apiList);

            // BƯỚC 3: Chuyển trang sau khi đã có đủ data offline
            router.replace('/home');
        } else {
            errorMessage.value = result?.message || 'Thông tin đăng nhập chưa chính xác';
        }
    } catch (err: any) {
        errorMessage.value = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra internet!';
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.flex-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: #f4f5f8; /* Màu nền nhẹ cho chuyên nghiệp */
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.error-message {
  color: var(--ion-color-danger);
  text-align: center;
  margin-top: 15px;
  font-size: 0.9rem;
  font-weight: 500;
}

.ion-margin-top {
  margin-top: 20px;
}

.ion-margin-bottom {
  margin-bottom: 15px;
}

.sync-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.95); /* Màu nền trắng mờ */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999; /* Đảm bảo đè lên tất cả các thành phần khác */
}

.sync-box {
    width: 80%;
    max-width: 300px;
    text-align: center;
}

.sync-box h3 {
    margin-bottom: 20px;
    font-weight: bold;
}

.sync-box p {
    margin-top: 10px;
    font-weight: 500;
}
</style>