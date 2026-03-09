<template>
    <ion-page>
        <ion-header>
            <ion-toolbar class="none-padding">
                <ion-buttons slot="start">
                    <ion-back-button default-href="/home"></ion-back-button>
                </ion-buttons>
                <ion-title>Area</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content>
            <ion-segment :scrollable="true" :value="activeSegment">
                <ion-segment-button v-for="([parent, children]) in datalistNav" :key="parent" :value="parent"
                    @click="openSelect($event, parent, children)">
                    <ion-label>{{ parent }} ▾</ion-label>
                </ion-segment-button>
            </ion-segment>

            <ion-progress-bar v-if="isLoading" type="indeterminate" color="primary"></ion-progress-bar>

            <ion-modal ref="modal" :is-open="isModalOpen" @didDismiss="isModalOpen = false" :initial-breakpoint="0.5"
                :breakpoints="[0, 0.5, 0.8]">
                <ion-header>
                    <ion-toolbar>
                        <ion-title>Chọn {{ activeSegment }}</ion-title>
                        <ion-buttons slot="end">
                            <ion-button @click="isModalOpen = false">Đóng</ion-button>
                        </ion-buttons>
                    </ion-toolbar>
                </ion-header>
                <ion-content class="ion-padding">
                    <ion-list v-if="currentOptions.length > 0">
                        <ion-item v-for="item in currentOptions" :key="item.routeId" :button="true"
                            @click="handleModalSelection(item)">
                            <ion-grid>
                                <ion-row class="ion-align-items-center">
                                    <ion-col size="auto">
                                        <ion-icon
                                            :icon="item.pointProblem || item.timeProblem ? warningOutline : newspaperOutline"
                                            :color="item.pointProblem || item.timeProblem ? 'danger' : 'success'"></ion-icon>
                                    </ion-col>
                                    <ion-col>
                                        <ion-label>
                                            <strong>{{ item.routeCode }}</strong> - {{ item.routeName }}
                                        </ion-label>
                                    </ion-col>
                                    <ion-col class="ion-text-end">
                                        <ion-label class="labelItem">{{ item.reportName }}</ion-label>
                                        <ion-note class="labelItem">
                                            <div
                                                :class="item.pointProblem ? 'pointProblem-danger' : 'pointProblem-success'">
                                                {{ item.pointStr }}
                                            </div>
                                            <div
                                                :class="item.timeProblem ? 'timeProblem-danger' : 'timeProblem-success'">
                                                {{ item.realityMinuteStr }}
                                            </div>
                                        </ion-note>
                                    </ion-col>
                                </ion-row>
                            </ion-grid>
                        </ion-item>
                    </ion-list>

                    <div v-else class="ion-padding ion-text-center no-route-container">
                        <ion-icon :icon="calendarOutline" style="font-size: 64px; color: #ccc;"></ion-icon>
                        <p>Danh sách chưa có</p>
                    </div>
                </ion-content>
            </ion-modal>

            <div class="list-container" style="margin-top: 10px;">
                <ion-list v-if="isLoading">
                    <ion-item v-for="i in 5" :key="i">
                        <ion-grid>
                            <ion-row class="ion-align-items-center">
                                <ion-col size="auto">
                                    <ion-skeleton-text animated
                                        style="width: 24px; height: 24px; border-radius: 50%;"></ion-skeleton-text>
                                </ion-col>
                                <ion-col><ion-skeleton-text animated
                                        style="width: 70%; height: 16px;"></ion-skeleton-text></ion-col>
                                <ion-col class="ion-text-end">
                                    <ion-skeleton-text animated
                                        style="width: 50%; height: 14px; margin-left: auto;"></ion-skeleton-text>
                                    <ion-skeleton-text animated
                                        style="width: 30%; height: 12px; margin-left: auto; margin-top: 4px;"></ion-skeleton-text>
                                </ion-col>
                            </ion-row>
                        </ion-grid>
                    </ion-item>
                </ion-list>

                <div v-else-if="filteredDetails.length === 0" class="ion-padding ion-text-center no-route-container">
                    <ion-icon :icon="calendarOutline" style="font-size: 64px; color: #ccc;"></ion-icon>
                    <p>Danh sách: <strong style="color: red;">{{ selectedItem ? selectedItem[0] : 'Chưa chọn mục'
                            }}</strong></p>
                    <ion-button fill="clear" @click="router.replace('/home')">Quay lại trang chủ</ion-button>
                </div>

                <ion-list v-else>
                    <ion-item v-for="(item) in displayedItems" :button="true"
                        @click="handleSelectedRow(Number(item.prId))" :key="item.prId"
                        :class="item.prHasProblem ? 'custom-item-false' : 'custom-item-true'">
                        <ion-grid>
                            <ion-row class="ion-align-items-center">
                                <ion-col size="auto">
                                    <ion-icon :icon="newspaperOutline"
                                        :color="item.prHasProblem ? 'danger' : 'success'"></ion-icon>
                                </ion-col>
                                <ion-col>
                                    <ion-label>
                                        <strong>{{ item.cpName }}</strong>
                                        <ion-text color="warning" v-if="item.isOfflineMock"
                                            style="font-size: 0.8em; display: block;">
                                            <ion-text color="danger">* </ion-text> Đang chờ đồng bộ <ion-icon
                                                :icon="warningOutline"></ion-icon>
                                        </ion-text>
                                    </ion-label>
                                </ion-col>
                                <ion-col class="ion-text-end">
                                    <ion-label class="labelItem">{{ item.reportName }}</ion-label>
                                    <ion-note class="labelItem">{{ item.reportAt.replace('T', ' ').slice(0, 19)
                                        }}</ion-note>
                                </ion-col>
                            </ion-row>
                        </ion-grid>
                    </ion-item>
                </ion-list>

                <ion-infinite-scroll @ionInfinite="loadMoreData($event)" :disabled="isInfiniteDisabled">
                    <ion-infinite-scroll-content loading-text="Đang tải thêm dữ liệu..."
                        loading-spinner="bubbles"></ion-infinite-scroll-content>
                </ion-infinite-scroll>
            </div>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import PointReport from '@/api/PointReport';
import router from '@/router';
import storageService from '@/services/storage.service';
import {
    IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonLabel,
    IonSegment, IonSegmentButton, IonContent, IonIcon, IonGrid, IonRow, IonCol,
    IonText, IonNote, loadingController, IonItem, IonList,
    onIonViewWillEnter, IonProgressBar, IonSkeletonText, IonInfiniteScroll,
    IonInfiniteScrollContent, IonButton, IonModal
} from '@ionic/vue';
import { calendarOutline, newspaperOutline, warningOutline } from "ionicons/icons";
import { computed, ref, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import presentAlert from '@/mixins/presentAlert';

const store = useStore();
const route = useRoute();

// --- STATE ---
const currentOptions = ref<any[]>([]);
const activeSegment = ref<string>('');
const selectedItem = ref<any>(null);
const isModalOpen = ref(false);
const isLoading = ref(false);
const searchQuery = ref('');
const currentPage = ref(1);
const displayedItems = ref<any[]>([]);
const isInfiniteDisabled = ref(false);
const itemsPerPage = 10;

const isOnline = computed(() => store.state.isOnline);

// --- 1. COMPUTED DATA ---
const datalistNav = computed(() => {
    const rawData = store.state.dataAreaBU;
    const areas = Array.isArray(rawData) ? rawData : (rawData?.data || []);
    const result: [string, any[]][] = [];

    for (const item of areas) {
        if (item.checkPoints && item.checkPoints.length > 0) {
            result.push([item.areaCode, item.patrolShifts || []]);
        }
    }
    console.log(result);

    return result;
});

const dataPR = computed(() => {
    // Nếu chưa chọn mục nào trong Modal, trả về mảng rỗng ngay lập tức
    if (!selectedItem.value) {
        return { cpCode: 'Chưa chọn mục', details: [] };
    }

    const dataStore = store.state.dataListCP;

    let listDetails = Array.isArray(dataStore) ? (dataStore[0]?.data || dataStore) : (dataStore?.data || []);
    if (!Array.isArray(listDetails)) listDetails = [];

    return {
        cpCode: listDetails[0]?.cpCode || 'Danh sách báo cáo',
        details: listDetails.map((item: any) => ({
            prId: item.prId,
            cpName: item.cpName || item.cpCode,
            createdName: item.createdName,
            createdAt: item.createdAt || '',
            prHasProblem: item.prHasProblem,
            isOfflineMock: item.isOfflineMock || false,
            reportName: item.reportName,
            reportAt: item.reportAt
        }))
    };
});

const filteredDetails = computed(() => {
    if (!searchQuery.value) return dataPR.value.details;
    const query = searchQuery.value.toLowerCase();
    return dataPR.value.details.filter((item: any) =>
        item.createdName.toLowerCase().includes(query) || item.cpName.toLowerCase().includes(query)
    );
});

// --- 2. WATCHERS ---
watch(filteredDetails, (newVal) => {
    currentPage.value = 1;
    isInfiniteDisabled.value = false;
    displayedItems.value = newVal.slice(0, itemsPerPage);
    if (newVal.length <= itemsPerPage) isInfiniteDisabled.value = true;
}, { immediate: true, deep: true });

watch(() => route.path, async (newPath, oldPath) => {
    if (newPath === '/area' && oldPath === '/home') {
        selectedItem.value = null; // Cực kỳ quan trọng để reset dataPR
        store.commit('SET_DATACP', []); // Reset dữ liệu tạm trong store
        await initDefaultTab(); // Mở lại modal chọn khu vực
    }
});

// --- 3. METHODS ---
const initDefaultTab = async () => {
    if (datalistNav.value.length > 0) {
        const firstTab = datalistNav.value[0];
        activeSegment.value = firstTab[0];
        currentOptions.value = firstTab[1];
        await nextTick();
        isModalOpen.value = true;
    }
};

onIonViewWillEnter(async () => {
    if (!selectedItem.value) await initDefaultTab();
});

const openSelect = async (event: any, parent: string, children: any[]) => {
    activeSegment.value = parent;
    currentOptions.value = children;
    await nextTick();
    isModalOpen.value = true;
};

// Xử lý khi chọn một mục trong Modal
const infiniteScrollRef = ref<any>(null); // Khai báo dòng này
const handleModalSelection = async (item: any) => {
    console.log(item);

    // 1. Chỉ ra lệnh đóng Modal
    isModalOpen.value = false;

    // 2. Chờ 400ms cho Modal biến mất hẳn khỏi màn hình mới làm việc khác
    setTimeout(async () => {
        isLoading.value = true;

        // --- Xóa sạch dữ liệu cũ & Mở khóa cuộn ---
        displayedItems.value = [];
        currentPage.value = 1;
        isInfiniteDisabled.value = false;

        selectedItem.value = [item.routeName, item.routeId];

        try {
            let reportData = null;

            if (isOnline.value) {
                try {
                    const responseBU = await PointReport.postBasePointReportView(item.psId);
                    let actualArray = Array.isArray(responseBU?.data) ? responseBU.data : (responseBU?.data?.data || []);
                    reportData = { data: actualArray };
                    console.log("Online Data:", reportData);

                    await storageService.set(`report_${item.routeId}`, reportData);
                } catch (apiErr) {
                    console.warn("API Error, falling back to offline");
                }
            }

            if (!reportData) {
                const rawCheckpointsId = store.state.dataBasePointReportView;
                const allReports = Array.isArray(rawCheckpointsId) ? rawCheckpointsId : (rawCheckpointsId?.data || []);
                const filteredReports = allReports.filter((rep: any) => rep.routeId === item.routeId || rep.routeId === Number(item.routeId));
                reportData = { data: filteredReports };
                console.log("Offline Data:", reportData);
            }

            // Gán dữ liệu mới vào Store
            store.commit('SET_DATACP', [reportData]);

            // --- Đợi Vue cập nhật danh sách mới ra màn hình ---
            await nextTick();

            // --- Reset bộ cuộn của Ionic ---
            if (infiniteScrollRef.value) {
                const el = await infiniteScrollRef.value.$el;
                el.complete(); // Đánh thức Infinite Scroll
            }

        } catch (e) {
            presentAlert.presentAlert('Lỗi', '', 'Không thể tải dữ liệu báo cáo.');
        } finally {
            isLoading.value = false;
        }
    }, 400); // KẾT THÚC SETTIMEOUT
};

const handleSelectedRow = async (prId: number) => {
    const loading = await loadingController.create({ message: 'Đang tải chi tiết...', spinner: 'crescent' });
    try {
        await loading.present();
        let detailData = null;

        if (isOnline.value) {
            try {
                const res = await PointReport.getPointReportId(prId);
                if (res?.data) {
                    detailData = res.data;
                    await storageService.set(`report_${prId}`, detailData.data || detailData);
                }
            } catch (e) { console.warn("Detail API Error"); }
        }

        if (!detailData) {
            const cached = await storageService.get(`report_${prId}`);
            if (cached) detailData = { data: cached };
        }

        if (!detailData) {
            const storeData = Array.isArray(store.state.dataCheckpointsId) ? store.state.dataCheckpointsId : (store.state.dataCheckpointsId?.data || []);
            const found = storeData.find((rep: any) => rep.prId === prId);
            if (found) detailData = { data: found };
        }

        if (!detailData?.data) throw new Error("No data");

        store.commit('SET_CURRENT_CHECKPOINT', detailData);
        await storageService.set('last_selected_checkpoint', detailData);
        await loading.dismiss();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        router.push({ path: `/checkpoint/detail/${prId}` });
    } catch (error) {
        await loading.dismiss();
        presentAlert.presentAlert('Thông báo', '', 'Không tìm thấy dữ liệu chi tiết báo cáo.');
    }
};

const loadMoreData = (event: any) => {
    setTimeout(() => {
        const nextStartIndex = currentPage.value * itemsPerPage;
        const nextEndIndex = nextStartIndex + itemsPerPage;
        displayedItems.value.push(...filteredDetails.value.slice(nextStartIndex, nextEndIndex));
        currentPage.value++;
        event.target.complete();
        if (displayedItems.value.length >= filteredDetails.value.length) isInfiniteDisabled.value = true;
    }, 500);
};
</script>

<style scoped>
ion-toolbar {
    --padding-top: 0;
    --padding-bottom: 0;
    --padding-start: 0;
    --padding-end: 0;
}

.pointProblem-danger,
.timeProblem-danger {
    color: #eb445a;
}

.pointProblem-success,
.timeProblem-success {
    color: #2dd36f;
}

.labelItem {
    font-size: 0.9em;
    display: block;
}

ion-segment {
    margin-bottom: 5px;
}
</style>