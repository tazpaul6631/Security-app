<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-back-button default-href="/home"></ion-back-button>
                </ion-buttons>
                <ion-title>Lộ trình tuần tra</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content>
            <transition name="fade-route" mode="out-in">

                <div v-if="currentActiveRoute" :key="currentActiveRoute.routeId">
                    <ion-card class="inspection-grid-card">
                        <ion-card-header>
                            <ion-card-title>{{ currentActiveRoute.routeName }}</ion-card-title>
                            <ion-card-subtitle>
                                Mã: {{ currentActiveRoute.routeCode }} | Giờ trực: {{ currentActiveRoute.psHour }}h
                            </ion-card-subtitle>
                        </ion-card-header>

                        <ion-card-content>
                            <card-route-points :details="currentActiveRoute.routeDetails" />

                            <div class="route-actions-bar">
                                <ion-button color="success" expand="block" class="btn-continue"
                                    @click="handleContinueScanning(currentActiveRoute.routeId)">
                                    <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
                                    BẮT ĐẦU QUÉT LỘ TRÌNH
                                </ion-button>
                            </div>
                        </ion-card-content>
                    </ion-card>
                </div>

                <div v-else :key="'none-' + currentHour" class="ion-padding ion-text-center no-route-container">
                    <ion-icon :icon="calendarOutline" style="font-size: 64px; color: #ccc;"></ion-icon>
                    <h3>Không có lộ trình</h3>
                    <p>Hiện không có lộ trình nào vào khung giờ {{ currentHour }}h.</p>
                    <ion-button fill="clear" @click="router.replace('/home')">Quay lại trang chủ</ion-button>
                </div>

            </transition>

            <ion-alert :is-open="isCancelAlertOpen" header="Cảnh báo!"
                message="Bạn có chắc chắn muốn hủy? Toàn bộ dữ liệu đã quét sẽ bị mất." :buttons="cancelButtons"
                @didDismiss="isCancelAlertOpen = false" />
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonIcon, IonButtons, IonBackButton,
    IonCardContent, IonContent, IonAlert, IonButton, IonCard, IonCardHeader,
    IonCardSubtitle, IonCardTitle
} from '@ionic/vue';
import { qrCodeOutline, calendarOutline } from 'ionicons/icons';
import CardRoutePoints from '@/components/CardRoutePoints.vue';
import { scannerService } from '@/services/scanner.service';

// Interfaces
interface RouteDetail {
    rdId: number;
    cpId: number;
    cpName: string;
    status: number;
}

interface Route {
    routeId: number;
    routeName: string;
    routeCode: string;
    psHour: number;
    routeDetails: RouteDetail[];
    areaId: number;
    roleId: number;
}

const store = useStore();
const router = useRouter();
const isCancelAlertOpen = ref(false);
const currentHour = ref(new Date().getHours());
let timer: any = null;

// Logic cập nhật giờ realtime
// onMounted(() => {
//     // Check mỗi 10 giây để đảm bảo giao diện nhảy ngay khi đổi giờ
//     timer = setInterval(() => {
//         const now = new Date();
//         const hourNow = now.getHours();
//         if (hourNow !== currentHour.value) {
//             console.log("Phát hiện đổi giờ hệ thống:", hourNow);
//             currentHour.value = hourNow;
//             // Khi currentHour đổi, computed currentActiveRoute sẽ tự tính toán lại
//         }
//     }, 10000);
// });

onUnmounted(() => {
    if (timer) clearInterval(timer);
});

const currentActiveRoute = computed<Route | null>(() => {
    const routes = (store.state.dataListRoute || []) as Route[];
    const userData = store.state.dataUser;

    const uRole = Number(userData?.userRoleId);
    const uArea = Number(userData?.userAreaId);

    if (!routes.length || isNaN(uRole) || isNaN(uArea)) return null;

    // Tìm route khớp Role, Area và GIỜ HIỆN TẠI
    const found = routes.find(r =>
        Number(r.areaId) === uArea &&
        Number(r.roleId) === uRole &&
        Number(r.psHour) === currentHour.value
    );

    return found || null;
});

const handleContinueScanning = async (routeId: number) => {
    setTimeout(async () => {
        try {
            await scannerService.startScanning(store, router, routeId);
        } catch (error) {
            console.error("Lỗi scanner:", error);
        }
    }, 300);
};

// Theo dõi để log thông tin khi tự động nhảy
watch(currentActiveRoute, (newVal, oldVal) => {
    if (newVal && oldVal && newVal.routeId !== oldVal.routeId) {
        console.log("Đã tự động chuyển lộ trình mới:", newVal.routeName);
    }
});

const cancelButtons = [
    { text: 'Đóng', role: 'cancel' },
    {
        text: 'Đồng ý hủy',
        role: 'confirm',
        handler: () => store.dispatch('resetCurrentRoute')
    }
];
</script>

<style scoped>
ion-toolbar {
    padding: 0 !important;
}

.no-route-container {
    margin-top: 100px;
}

.route-actions-bar {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed #ddd;
}

.btn-continue {
    --border-radius: 8px;
    height: 50px;
    font-weight: bold;
}

/* Hiệu ứng Fade mượt mà khi đổi Route */
.fade-route-enter-active,
.fade-route-leave-active {
    transition: all 0.5s ease;
}

.fade-route-enter-from {
    opacity: 0;
    transform: translateY(10px);
    /* Bay nhẹ từ dưới lên */
}

.fade-route-leave-to {
    opacity: 0;
    transform: translateY(-10px);
    /* Bay nhẹ lên trên rồi biến mất */
}

/* Các style cũ của bạn giữ nguyên */
.inspection-grid-card {
    transition: box-shadow 0.3s ease;
}
</style>