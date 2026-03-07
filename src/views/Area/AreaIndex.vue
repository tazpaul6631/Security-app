<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
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

            <ion-select ref="areaCPSelectRef" interface="alert" :interface-options="customAlertOptions"
                style="display: none;" :value="selectedItem" @ionChange="handleSelectionChange($event)">

                <ion-select-option v-for="item in currentOptions" :key="item[1]" :value="item">
                    {{ item[0] }}
                </ion-select-option>
            </ion-select>

            <div class="list-container" style="margin-top: 10px;">

                <ion-list v-if="isLoading">
                    <ion-item v-for="i in 5" :key="i">
                        <ion-grid>
                            <ion-row class="ion-align-items-center">
                                <ion-col size="auto">
                                    <ion-skeleton-text :animated="true"
                                        style="width: 24px; height: 24px; border-radius: 50%;"></ion-skeleton-text>
                                </ion-col>
                                <ion-col>
                                    <ion-skeleton-text :animated="true"
                                        style="width: 70%; height: 16px;"></ion-skeleton-text>
                                </ion-col>
                                <ion-col class="ion-text-end">
                                    <ion-skeleton-text :animated="true"
                                        style="width: 50%; height: 14px; margin-left: auto;"></ion-skeleton-text>
                                    <ion-skeleton-text :animated="true"
                                        style="width: 30%; height: 12px; margin-left: auto; margin-top: 4px;"></ion-skeleton-text>
                                </ion-col>
                            </ion-row>
                        </ion-grid>
                    </ion-item>
                </ion-list>

                <div v-else-if="filteredDetails.length === 0" class="ion-padding ion-text-center no-route-container">
                    <ion-icon :icon="calendarOutline" style="font-size: 64px; color: #ccc;"></ion-icon>
                    <p>Danh sách: <strong style="color: red;">
                            {{ selectedItem ? selectedItem[0] : 'Chưa chọn' }}
                        </strong></p>
                    <ion-button fill="clear" @click="router.replace('/home')">Quay lại trang chủ</ion-button>
                </div>

                <ion-list v-else>
                    <ion-item v-for="(item) in displayedItems" :button="true"
                        @click="handleSelectedRow(Number(item.prId))" :key="item.prId"
                        :class="item.prHasProblem ? 'custom-item-false' : 'custom-item-true'">
                        <ion-grid>
                            <ion-row class="ion-align-items-center">
                                <ion-col size="auto">
                                    <ion-icon :icon="documentOutline" :color="item.prHasProblem ? 'danger' : 'success'">
                                    </ion-icon>
                                </ion-col>
                                <ion-col>
                                    <ion-label>
                                        <strong>
                                            {{ item.cpName }}
                                            <ion-text color="warning" v-if="item.isOfflineMock"
                                                style="font-size: 0.8em; display: block;">
                                                <ion-text color="danger">* </ion-text> Đang chờ đồng bộ <ion-icon
                                                    :icon="warningOutline"></ion-icon>
                                            </ion-text>
                                        </strong>
                                    </ion-label>
                                </ion-col>
                                <ion-col class="ion-text-end">
                                    <ion-label class="labelItem">
                                        {{ item.createdName }}

                                    </ion-label>
                                    <ion-note class="labelItem">{{ item.createdAt.replace('T', ' ').slice(0, 16)
                                        }}</ion-note>
                                </ion-col>
                            </ion-row>
                        </ion-grid>
                    </ion-item>
                </ion-list>

                <ion-infinite-scroll @ionInfinite="loadMoreData($event)" :disabled="isInfiniteDisabled">
                    <ion-infinite-scroll-content loading-text="Đang tải thêm dữ liệu..." loading-spinner="bubbles">
                    </ion-infinite-scroll-content>
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
    IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonContent, IonIcon,
    IonGrid, IonRow, IonCol, IonText, IonNote, loadingController, IonItem,
    IonList, alertController, onIonViewWillEnter, IonProgressBar, IonSkeletonText,
    IonInfiniteScroll, IonInfiniteScrollContent, IonButton
} from '@ionic/vue';
import { calendarOutline, documentOutline, warningOutline } from "ionicons/icons";
import { computed, ref, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import presentAlert from '@/mixins/presentAlert';

// Theo dõi mỗi khi đường dẫn thay đổi
onIonViewWillEnter(async () => {
    if (!selectedItem.value && datalistNav.value.length > 0) {

        // 1. Lấy dữ liệu của tab ĐẦU TIÊN (ví dụ BU1)
        const firstTab = datalistNav.value[0];
        const parent = firstTab[0];     // Tên Parent: "BU1"
        const children = firstTab[1];   // Mảng danh sách các khu vực con

        // 2. Cập nhật giao diện ngầm
        activeSegment.value = parent;
        currentOptions.value = children;
        customAlertOptions.value.header = `${parent} CheckPoints`;

        // 3. Đợi Vue render mảng dữ liệu con vào thẻ <ion-select>
        await nextTick();

        // 4. Kích hoạt mở Popup lên ngay lập tức mà không cần Event click
        if (areaCPSelectRef.value) {
            areaCPSelectRef.value.$el.open();
        }
    }
});

const route = useRoute();

watch(() => route.path, async (newPath, oldPath) => {
    // Nếu trang MỚI là trang này (/area) VÀ trang CŨ là trang chủ (/home)
    if (newPath === '/area' && oldPath === '/home') {

        selectedItem.value = null;
        if (areaCPSelectRef.value) {
            areaCPSelectRef.value.$el.value = null;
        }
        store.commit('SET_DATACP', []);

        if (!selectedItem.value && datalistNav.value.length > 0) {

            // 1. Lấy dữ liệu của tab ĐẦU TIÊN (ví dụ BU1)
            const firstTab = datalistNav.value[0];
            const parent = firstTab[0];     // Tên Parent: "BU1"
            const children = firstTab[1];   // Mảng danh sách các khu vực con

            // 2. Cập nhật giao diện ngầm
            activeSegment.value = parent;
            currentOptions.value = children;
            customAlertOptions.value.header = `Chọn mục của ${parent}`;

            // 3. Đợi Vue render mảng dữ liệu con vào thẻ <ion-select>
            await nextTick();

            // 4. Kích hoạt mở Popup lên ngay lập tức mà không cần Event click
            if (areaCPSelectRef.value) {
                areaCPSelectRef.value.$el.open();
            }
        }
    }
});
//////////////////////////////////////////////////

const store = useStore();

// Biến lưu trữ Option của Segment ĐANG ĐƯỢC CLICK để nạp vào Select
const currentOptions = ref<[string, any][]>([]);
const activeSegment = ref<string>(''); // Biến lưu tab đang active
const selectedItem = ref<any>(null); // Biến lưu kết quả người dùng đã chọn
const areaCPSelectRef = ref<any>(null);

const isLoading = ref(false);
const isOnline = computed(() => store.state.isOnline);

// Alert Options dùng ref() để có thể đổi Title linh hoạt theo tab được bấm
const customAlertOptions = ref({
    cssClass: 'blur-backdrop-alert',
    header: 'Chọn khu vực'
});

// Xử lý dữ liệu từ Store (Giữ nguyên logic của bạn)
const datalistNav = computed(() => {
    const rawData = store.state.dataAreaBU;
    const areas = Array.isArray(rawData) ? rawData : (rawData?.data || []);
    const result: [string, [string, string][]][] = [];

    for (const item of areas) {
        if (item.checkPoints && item.checkPoints.length > 0) {
            result.push([
                item.areaCode,
                item.checkPoints.map((cp: any) => [cp.cpCode, cp.cpId])
            ]);
        }
    }
    // Gán tab mặc định là phần tử đầu tiên nếu mảng có dữ liệu
    if (result.length > 0 && !activeSegment.value) {
        activeSegment.value = result[0][0];
    }
    return result;
});

// === 1. COMPUTED: Đọc dữ liệu từ Vuex ===
const dataPR = computed(() => {
    // BƯỚC CHẶN: Nếu chưa chọn gì ở dropdown, lập tức trả về mảng rỗng
    if (!selectedItem.value) {
        return { cpCode: 'Chưa có CheckPoints', details: [] };
    }

    const dataStore = store.state.dataListCP;
    console.log(dataStore);

    let listDetails = Array.isArray(dataStore) ? (dataStore[0]?.data || dataStore) : (dataStore?.data || []);
    if (!Array.isArray(listDetails) || listDetails.length === 0) return { cpCode: 'Chưa có CheckPoints', details: [] };

    return {
        cpCode: listDetails[0]?.cpCode || 'Danh sách báo cáo',
        details: listDetails.map((item: any) => ({
            prId: item.prId,
            cpName: item.cpName || item.cpCode,
            createdName: item.createdName,
            createdAt: item.createdAt || '',
            prHasProblem: item.prHasProblem,
            prNote: item.prNote,
            isOfflineMock: item.isOfflineMock || false
        }))
    };
});

////////////////////////////////////////////////////
const searchQuery = ref('');

const filteredDetails = computed(() => {
    if (!searchQuery.value) return dataPR.value.details;
    const query = searchQuery.value.toLowerCase();
    return dataPR.value.details.filter((item: any) =>
        item.createdName.toLowerCase().includes(query) ||
        item.cpName.toLowerCase().includes(query)
    );
});
//////////////////////////////////////////////////////

// ==========================================
// LOGIC INFINITE SCROLL (CUỘN LOAD THÊM)
// ==========================================
const itemsPerPage = 10; // Mỗi lần cuộn load thêm 10 dòng
const currentPage = ref(1);
const displayedItems = ref<any[]>([]); // Mảng thực tế hiển thị trên UI
const isInfiniteDisabled = ref(false); // Trạng thái bật/tắt cuộn

// Theo dõi sự thay đổi của dữ liệu tổng (khi chuyển Dropdown hoặc Gõ tìm kiếm)
watch(filteredDetails, (newVal) => {
    // Nếu dữ liệu tổng thay đổi, reset lại từ trang 1
    currentPage.value = 1;
    isInfiniteDisabled.value = false;

    // Chỉ lấy 10 phần tử đầu tiên để hiển thị lúc đầu
    displayedItems.value = newVal.slice(0, itemsPerPage);

    // Nếu danh sách tổng ít hơn 10 cái, tắt luôn chức năng cuộn
    if (newVal.length <= itemsPerPage) {
        isInfiniteDisabled.value = true;
    }
}, { immediate: true, deep: true });

// Hàm kích hoạt khi người dùng cuộn kịch kim xuống đáy
const loadMoreData = (event: any) => {
    // Tạo độ trễ nhẹ (500ms) để hiện hiệu ứng xoay xoay cho đẹp mắt
    setTimeout(() => {
        const nextStartIndex = currentPage.value * itemsPerPage;
        const nextEndIndex = nextStartIndex + itemsPerPage;

        // Cắt khúc dữ liệu tiếp theo từ mảng tổng
        const nextItems = filteredDetails.value.slice(nextStartIndex, nextEndIndex);

        // Nhồi thêm vào mảng đang hiển thị
        displayedItems.value.push(...nextItems);
        currentPage.value++;

        // Báo cho Ionic biết là đã load xong để nó tắt cái xoay xoay
        event.target.complete();

        // Kiểm tra nếu đã load hết sạch data thì khóa luôn Infinite Scroll
        if (displayedItems.value.length >= filteredDetails.value.length) {
            isInfiniteDisabled.value = true;
        }
    }, 500);
};
////////////////////////////////////////////////

// Hàm mở Select khi bấm vào Segment
const openSelect = async (event: Event, parent: string, children: any[]) => {
    // 1. Cập nhật lại tab đang chọn
    activeSegment.value = parent;

    // 2. Gán lại mảng con cho Select
    currentOptions.value = children;

    // 3. (Tùy chọn) Đổi tiêu đề popup cho sinh động
    customAlertOptions.value.header = `Chọn mục của ${parent}`;

    // 4. QUAN TRỌNG: Phải chờ Vue render lại danh sách option mới rồi mới mở Popup
    await nextTick();

    // 5. Mở Popup
    areaCPSelectRef.value?.$el?.open(event);
};

// Hàm xử lý kết quả trả về
const handleSelectionChange = async (event: any) => {
    if (event.detail.value) {
        selectedItem.value = event.detail.value;
        console.log("Đã chọn:", selectedItem.value[1]);

        try {
            // Chỉ cần gán biến này là giao diện tự động hiện Skeleton và ProgressBar
            isLoading.value = true;

            // Cố tình delay 1 chút (300ms) để UI render mượt mà hơn khi chuyển đổi (tuỳ chọn)
            await new Promise(resolve => setTimeout(resolve, 300));

            let reportData = null;

            // BƯỚC 1: Nếu có mạng -> Gọi API lấy mới nhất
            if (isOnline.value) {
                console.log('📡 Trạng thái: ONLINE. Đang gọi API lấy báo cáo...');
                try {
                    const responseBU = await PointReport.postPointReport(selectedItem.value[1]);

                    let actualArray = [];
                    if (Array.isArray(responseBU?.data)) {
                        actualArray = responseBU.data;
                    } else if (Array.isArray(responseBU?.data?.data)) {
                        actualArray = responseBU.data.data;
                    }

                    reportData = { data: actualArray };
                    await storageService.set(`report_${selectedItem.value[1]}`, reportData);
                } catch (apiErr) {
                    console.warn("⚠️ Không thể tải bản mới, tự động chuyển sang luồng Offline.");
                }
            }

            // BƯỚC 2: Nếu Offline hoặc gọi API xịt
            if (!reportData) {
                console.log('🔌 Trạng thái: OFFLINE. Bắt đầu bóc tách từ kho Vuex...');
                const rawCheckpointsId = store.state.dataCheckpointsId;
                const allReports = Array.isArray(rawCheckpointsId) ? rawCheckpointsId : (rawCheckpointsId?.data || []);

                const filteredReports = allReports.filter((item: any) =>
                    item.cpId === selectedItem.value[1] || item.cpId === Number(selectedItem.value[1])
                );
                reportData = { data: filteredReports };
            }

            // BƯỚC 3: Đẩy vào Store
            store.commit('SET_DATACP', [reportData]);
        } catch (e) {
            console.error("❌ Lỗi điều hướng Menu:", e);
            presentAlert.presentAlert('Lỗi', '', 'Đã có lỗi xảy ra khi mở khu vực này.');
        } finally {
            // Load xong thì tắt đi để hiện danh sách thật
            isLoading.value = false;
        }
    }
};

const handleSelectedRow = async (prId: number) => {
    const loading = await loadingController.create({
        message: 'Đang tải chi tiết báo cáo...',
        spinner: 'crescent',
        backdropDismiss: false,
    });

    try {
        await loading.present();

        let selectedItem = null;

        if (isOnline.value) {
            try {
                const responseBU = await PointReport.getPointReportId(prId);
                if (responseBU && responseBU.data) {
                    selectedItem = responseBU.data;
                    await storageService.set(`report_${prId}`, selectedItem.data || selectedItem);
                }
            } catch (apiErr) {
                console.warn("API lỗi hoặc timeout, chuyển sang tìm trong máy.");
            }
        }

        if (!selectedItem) {
            const cachedReport = await storageService.get(`report_${prId}`);
            console.log(prId);

            console.log(cachedReport);

            if (cachedReport) {
                selectedItem = { data: cachedReport };
            }
        }

        if (!selectedItem) {
            const rawCheckpointsId = store.state.dataCheckpointsId;
            const storeData = Array.isArray(rawCheckpointsId) ? rawCheckpointsId : (rawCheckpointsId?.data || []);
            console.log(storeData);

            const found = storeData.find((item: any) => item.prId === prId);
            console.log(found);

            if (found) {
                selectedItem = { data: found };
            }
        }

        console.log(selectedItem);

        if (!selectedItem || !selectedItem.data) {
            await loading.dismiss();
            const alert = await alertController.create({
                header: 'Thông báo',
                message: 'Không tìm thấy dữ liệu báo cáo này trên máy. Vui lòng kiểm tra kết nối mạng.',
                buttons: ['OK']
            });
            await alert.present();
            return;
        }

        store.commit('SET_CURRENT_CHECKPOINT', selectedItem);
        await storageService.set('last_selected_checkpoint', selectedItem);
        console.log(selectedItem);

        await loading.dismiss();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        router.push({ path: `/checkpoint/detail/${prId}` });

    } catch (error) {
        await loading.dismiss();
        console.error("Lỗi khi xử lý link checkpoint:", error);
        const alert = await alertController.create({
            header: 'Lỗi hệ thống',
            message: 'Có lỗi xảy ra trong quá trình tải dữ liệu.',
            buttons: ['Đóng']
        });
        await alert.present();
    }
};
</script>

<style>
.blur-backdrop-alert::part(backdrop) {
    /* Làm nhòe/mờ cảnh vật phía sau (Tăng số px để mờ nhiều hơn) */
    backdrop-filter: blur(6px);

    /* Làm nền tối đi một chút để popup nổi bật hơn */
    background: rgba(0, 0, 0, 0.4);
}
</style>

<style scoped>
ion-toolbar {
    padding: 0 !important;
}

ion-segment-view {
    height: 150px;
}

ion-segment-content {
    display: flex;
    align-items: center;
    justify-content: center;
}

ion-segment-content:nth-of-type(1) {
    background: lightpink;
}

ion-segment-content:nth-of-type(2) {
    background: lightblue;
}

ion-segment-content:nth-of-type(3) {
    background: lightgreen;
}

ion-segment-content:nth-of-type(4) {
    background: rgb(219, 238, 150);
}

ion-segment-content:nth-of-type(5) {
    background: rgb(167, 133, 221);
}

ion-segment-content:nth-of-type(6) {
    background: rgb(238, 144, 214);
}
</style>