import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { alertController } from '@ionic/vue';
import { Store } from 'vuex';
import { Router } from 'vue-router';
import storageService from '@/services/storage.service';
import CheckPointScanQr from '@/api/CheckPointScanQr';

export const scannerService = {
    async requestPermissions() {
        const { camera } = await BarcodeScanner.requestPermissions();
        return camera === 'granted' || camera === 'limited';
    },

    async presentAlert(h: string, m: string) {
        const alert = await alertController.create({ header: h, message: m, buttons: ['OK'] });
        await alert.present();
    },

    async startScanning(store: Store<any>, router: Router) {
        const now = new Date();
        const currentTimeString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);

        const granted = await this.requestPermissions();
        if (!granted) return;

        const { barcodes } = await BarcodeScanner.scan();
        if (!barcodes || barcodes.length === 0) return;

        const urlString = barcodes[0].rawValue;
        const listScanQr = { cpwId: '', cpwCode: '' };

        if (urlString) {
            try {
                const url = new URL(urlString);
                const segments = url.pathname.split('/');
                listScanQr.cpwId = segments[3];
                listScanQr.cpwCode = segments[4];
            } catch (e) {
                await this.presentAlert('Lỗi', 'Mã QR không hợp lệ');
                return;
            }
        }

        try {
            let finalData = null;
            const isOnline = store.state.isOnline;

            // 1. Xử lý Online
            if (isOnline) {
                try {
                    const res = await CheckPointScanQr.getCheckPointScanQr(listScanQr);
                    let actualData = res?.data?.data || res?.data;
                    if (Array.isArray(actualData)) actualData = actualData[0];
                    if (actualData) {
                        finalData = actualData;
                        // Lưu dự phòng riêng cho ID này
                        await storageService.set(`checkpoint_${listScanQr.cpwId}`, actualData);
                    }
                } catch (e) {
                    console.warn("API lỗi hoặc timeout, tự động kiểm tra kho Offline");
                }
            }

            // 2. Xử lý Offline (Tìm trong kho tổng từ App.vue)
            if (!finalData) {
                console.log('🔌 Trạng thái OFFLINE: Đang tìm Checkpoint trong kho tổng...');

                let response = await storageService.get('checkpoints');
                let allCheckpoints = [];

                if (Array.isArray(response)) {
                    allCheckpoints = response;
                } else if (response && Array.isArray(response.data)) {
                    allCheckpoints = response.data;
                }

                const foundItem = allCheckpoints.find(
                    (item: any) => String(item.cpId) === String(listScanQr.cpwId)
                );

                if (foundItem) {
                    finalData = foundItem; // 🚀 BỎ LUÔN VỤ BỌC { data: foundItem }. Gán thẳng cái lõi!
                    console.log('✅ Đã lấy FULL DATA Offline thành công:', finalData);
                }
            }

            console.log("📦 Dữ liệu sạch sẽ chuẩn bị đưa vào Vuex:", finalData);

            // 3. Kết quả
            if (finalData) {
                store.commit('SET_DATASCANQR', finalData);
                await storageService.set('data_scanqr', finalData);
                await storageService.set('currentTime_scanqr', currentTimeString);

                // Đợi Camera đóng hẳn rồi mới chuyển trang
                setTimeout(() => {
                    router.replace('/checkpoint/create');
                }, 100);
            } else {
                await this.presentAlert('Thông báo', 'Không tìm thấy thông tin điểm này. Hãy đồng bộ dữ liệu khi có mạng.');
            }
        } catch (error) {
            await this.presentAlert('Lỗi', 'Hệ thống không thể xử lý mã quét.');
        }
    }
};