<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-back-button default-href="/home"></ion-back-button>
                </ion-buttons>
                <ion-title>
                    Route
                </ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content>
            <div v-if="dataListRoute.length > 0">
                <ion-accordion-group expand="inset">
                    <div v-for="route in dataListRoute" :key="route.routeId">
                        <ion-accordion :value="String(route.routeId)" v-if="route.areaId === dataUser.userAreaId">
                            <ion-item slot="header" color="light">
                                <ion-label><strong class="route-name">{{ route.routeName }}</strong></ion-label>
                            </ion-item>
                            <div class="ion-padding inspection-grid-card" slot="content"
                                @click="handleRouteSelected(route.routeId, route.routeName)" id="present-alert">
                                <ion-card-content>
                                    <div class="points-grid">
                                        <div v-for="(point, idx) in route.routeDetails" :key="point.rdId"
                                            class="grid-item-wrapper">
                                            <div class="point-node">
                                                <div class="mini-thumb">
                                                    <img :src="`https://picsum.photos/200?sig=${point.cpId}`" />
                                                    <div v-if="point.status === 1" class="check-icon">
                                                        <ion-icon :icon="checkmark"></ion-icon>
                                                    </div>
                                                </div>
                                                <span class="point-number">{{ idx + 1 }}</span>
                                            </div>

                                            <div v-if="(idx + 1) % 4 !== 0 && idx !== route.routeDetails.length - 1"
                                                class="h-line">
                                            </div>

                                            <div class="point-label">{{ point.cpName }}</div>
                                        </div>
                                    </div>
                                </ion-card-content>
                            </div>
                        </ion-accordion>
                    </div>
                </ion-accordion-group>
            </div>

            <div v-else class="ion-padding ion-text-center">
                <p>Đang tải dữ liệu lộ trình...</p>
            </div>

            <ion-alert :is-open="isAlertOpen" :header="`Bạn chọn ${nameRoute}?`" :buttons="alertButtons"
                @didDismiss="isAlertOpen = false"></ion-alert>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonIcon, IonButtons, IonBackButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonContent, IonBadge,
    IonAccordion, IonAccordionGroup, IonItem, IonLabel, IonAlert
} from '@ionic/vue';
import { checkmark } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

interface RouteDetail {
    rdId: number;
    cpId: number;
    cpName: string;
    status: number;
}

interface Route {
    routeId: number;
    routeName: string;
    routeDetails: RouteDetail[];
    areaId: number;
}

const nameRoute = ref();

// Lấy dữ liệu an toàn từ store, mặc định là mảng rỗng nếu chưa có data
const dataListRoute = computed<Route[]>(() => store.state.dataListRoute || []);
const dataUser = computed(() => store.state.dataUser);
const isAlertOpen = ref(false);

const handleRouteSelected = (id: number, name: string) => {
    console.log(id);
    nameRoute.value = name;
    isAlertOpen.value = true;
}
// Hàm kiểm tra index hiện tại (tùy biến theo logic của bạn)
// const isCurrent = (idx: number, details: RouteDetail[]) => {
//     if (!details) return false;
//     const firstIncomplete = details.findIndex(p => p.status === 0);
//     return idx === (firstIncomplete === -1 ? 0 : firstIncomplete);
// };

const alertButtons = [
    {
        text: 'Cancel',
        role: 'cancel',
        handler: () => {
            console.log('Alert canceled');
        },
    },
    {
        text: 'OK',
        role: 'confirm',
        handler: () => {
            console.log('Alert confirmed');
        },
    },
];
</script>

<style scoped>
ion-toolbar {
    padding: 0 !important;
}

.inspection-grid-card {
    background-color: #FFF7ED;
    border-radius: 0 0 12px 12px;
    margin-bottom: 12px;
}

.route-name {
    color: #05DF72;
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
    border: 2px solid var(--ion-color-success);
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
    background: var(--ion-color-success);
    position: absolute;
    top: 22px;
    right: -25%;
    width: 37%;
    height: 2px;
    z-index: 0;
}

.point-label {
    width: 100%;
    margin-top: 5px;
    font-size: 10px;
    text-align: center;
    color: #333;

    /* Line clamp logic */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    /* Hiển thị tối đa 2 dòng */
    overflow: hidden;
    line-height: 1.2;

    /* Đảm bảo từ dài không đẩy khung */
    word-wrap: break-word;
    white-space: normal;
}

.points-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px 8px;
    /* Tăng khoảng cách giữa các hàng */
    padding: 10px 5px;
}
</style>