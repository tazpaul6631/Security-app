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
            <div v-if="isLoading" class="ion-padding ion-text-center">
                <ion-spinner name="crescent"></ion-spinner>
                <p>Đang tải lộ trình...</p>
            </div>

            <transition v-else name="fade-route" mode="out-in">
                <div v-if="currentActiveRoute" :key="currentActiveRoute.routeId">
                    <ion-card class="inspection-grid-card">
                        <ion-card-header>
                            <ion-card-title>{{ currentActiveRoute.routeName }}</ion-card-title>
                            <ion-card-subtitle>
                                Mã: {{ currentActiveRoute.routeCode }} | Giờ trực: {{ currentActiveRoute.psHourFrom }}h
                            </ion-card-subtitle>
                        </ion-card-header>

                        <ion-card-content>
                            <card-route-points :details="currentActiveRoute.routeDetails" />

                            <div class="route-actions-bar active-controls">
                                <ion-button color="danger" @click="confirmCancelRoute" class="btn-cancel">
                                    <ion-icon slot="start" :icon="trashOutline"></ion-icon>
                                    HỦY BỎ
                                </ion-button>
                                <ion-button color="success" class="btn-continue"
                                    @click="handleContinueScanning(currentActiveRoute.routeId)">
                                    <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
                                    SCAN
                                </ion-button>
                            </div>
                        </ion-card-content>
                    </ion-card>
                </div>

                <div v-else :key="'none-' + currentHour" class="ion-padding ion-text-center no-route-container">
                    <div class="no-route-content">
                        <ion-icon :icon="calendarOutline" class="big-icon"></ion-icon>
                        <h3>Không có lộ trình</h3>
                        <p>Hiện không có lộ trình nào vào khung giờ <strong>{{ currentHour }}h</strong>.</p>
                        <ion-button fill="outline" @click="router.replace('/home')" class="ion-margin-top">
                            Quay lại trang chủ
                        </ion-button>
                    </div>
                </div>
            </transition>

            <ion-alert :is-open="isCancelAlertOpen" header="Cảnh báo!"
                message="Bạn có chắc chắn muốn hủy? Toàn bộ dữ liệu đã quét sẽ bị mất." :buttons="cancelButtons"
                @didDismiss="isCancelAlertOpen = false" />
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonIcon, IonButtons, IonBackButton,
    IonCardContent, IonContent, IonAlert, IonButton, IonCard, IonCardHeader,
    IonCardSubtitle, IonCardTitle, IonSpinner
} from '@ionic/vue';
import { qrCodeOutline, calendarOutline, trashOutline } from 'ionicons/icons';
import CardRoutePoints from '@/components/CardRoutePoints.vue';
import { scannerService } from '@/services/scanner.service';

// --- Interfaces ---
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
    psHourFrom: number;
    psHourTo: number;
    routeDetails: RouteDetail[];
    areaId: number;
    roleId: number;
    psId: number;
}

const store = useStore();
const router = useRouter();
const isCancelAlertOpen = ref(false);
const isLoading = ref(true);
const isScanning = ref(false);

// Giờ hiện tại - Reactive
const currentHour = ref(new Date().getHours());
let timer: any = null;

// --- Logic Cập nhật Giờ & Lộ trình ---

const updateSystemTime = () => {
    const now = new Date();
    const hourNow = now.getHours();
    if (hourNow !== currentHour.value) {
        console.log("Đã sang giờ mới hoặc phát hiện giờ hệ thống thay đổi:", hourNow);
        currentHour.value = hourNow;
    }
};

// Xử lý khi người dùng mở lại App từ chế độ nền (Background)
const handleAppWakeUp = () => {
    if (document.visibilityState === 'visible') {
        updateSystemTime();
    }
};

onMounted(async () => {
    try {
        // Khôi phục dữ liệu từ Store
        const tasks = [];
        if (!store.state.dataListRoute?.length) tasks.push(store.dispatch('restoreListRoute'));
        if (!store.state.dataUser) tasks.push(store.dispatch('restoreUser'));

        if (tasks.length > 0) await Promise.all(tasks);
    } catch (e) {
        console.error("Lỗi khởi tạo dữ liệu:", e);
    } finally {
        isLoading.value = false;
    }

    // Kiểm tra giờ ngay lập tức
    updateSystemTime();

    // Lắng nghe sự kiện "Wake up" (Rất quan trọng cho Mobile)
    window.addEventListener('visibilitychange', handleAppWakeUp);
    window.addEventListener('focus', updateSystemTime);

    // Timer dự phòng check mỗi 5 giây (Cân bằng giữa chính xác và tiết kiệm pin)
    timer = setInterval(updateSystemTime, 5000);
});

onUnmounted(() => {
    // Dọn dẹp sạch sẽ tránh Memory Leak
    if (timer) clearInterval(timer);
    window.removeEventListener('visibilitychange', handleAppWakeUp);
    window.removeEventListener('focus', updateSystemTime);
});

// --- Computed & Methods ---
const currentActiveRoute = computed<Route | null>(() => {
    const routes = store.state.dataListRoute;
    const userData = store.state.dataUser;
    console.log("Trang Cha: dataListRoute vừa thay đổi tham chiếu, đang tính lại Route...");
    if (!routes || !routes.length || !userData) return null;

    const uRole = Number(userData.userRoleId);
    const uArea = Number(userData.userAreaId);
    const hNow = currentHour.value;

    console.log(routes);

    const foundRoute = routes.find((r: any) => {
        const areaMatch = Number(r.areaId) === uArea;
        const roleMatch = Number(r.roleId) === uRole;
        const hourMatch = hNow >= Number(r.psHourFrom) && hNow <= Number(r.psHourTo);
        return areaMatch && roleMatch && hourMatch;
    });
    console.log(foundRoute);
    store.commit('SET_PSID', foundRoute?.psId)
    console.log("Lộ trình hiện tại:", foundRoute?.routeName, "Chi tiết:", foundRoute?.routeDetails);

    // Quan trọng: Trả về một bản sao sâu (Deep copy) nếu cần để cắt đứt tham chiếu cũ
    return foundRoute ? { ...foundRoute } : null;
});

const handleContinueScanning = async (routeId: number) => {
    if (isScanning.value) return;
    isScanning.value = true;
    try {
        // Giả sử sau khi quét xong, scannerService trả về cpId vừa quét
        await scannerService.startScanning(store, router, routeId);
    } catch (error) {
        console.error("Lỗi scanner:", error);
    } finally {
        isScanning.value = false;
    }
};

const confirmCancelRoute = () => {
    isCancelAlertOpen.value = true;
};

const cancelButtons = [
    { text: 'Đóng', role: 'cancel' },
    {
        text: 'Đồng ý hủy',
        role: 'confirm',
        cssClass: 'alert-button-confirm',
        handler: () => store.dispatch('resetCurrentRoute')
    }
];
</script>

<style scoped>
ion-toolbar {
    padding: 0 !important;
}

/* Layout */
.active-controls {
    display: flex;
    gap: 12px;
    justify-content: space-between;
}

.route-actions-bar {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed #ddd;
}

.btn-cancel,
.btn-continue {
    --border-radius: 8px;
    height: 50px;
    font-weight: bold;
    flex: 1;
}

/* No Route State */
.no-route-container {
    height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.big-icon {
    font-size: 80px;
    color: #cbd5e0;
    margin-bottom: 16px;
}

/* Animations */
.fade-route-enter-active,
.fade-route-leave-active {
    transition: all 0.4s ease;
}

.fade-route-enter-from {
    opacity: 0;
    transform: translateY(15px);
}

.fade-route-leave-to {
    opacity: 0;
    transform: translateY(-15px);
}

.inspection-grid-card {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 12px;
}
</style>