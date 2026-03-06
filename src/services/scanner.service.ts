import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Store } from 'vuex';
import { Router } from 'vue-router';
import storageService from '@/services/storage.service';
import CheckPointScanQr from '@/api/CheckPointScanQr';
import presentAlert from '@/mixins/presentAlert';

export const scannerService = {
    async requestPermissions() {
        const { camera } = await BarcodeScanner.requestPermissions();
        return camera === 'granted' || camera === 'limited';
    },

    async startScanning(store: Store<any>, router: Router, routeId: number) {
        const now = new Date();
        const currentTimeString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);

        const dataUser = store.state.dataUser;
        const dataListRoute = store.state.dataListRoute;

        // Lưu routeId đang thực hiện vào store/storage
        store.commit('SET_ROUTE_ID', routeId);
        await storageService.set('current_route_id', routeId);

        // 1. Tìm lộ trình cụ thể mà người dùng đã chọn
        const currentRoute = dataListRoute.find((r: any) => r.routeId === routeId);
        if (!currentRoute) {
            await presentAlert.presentAlert('Lỗi', '', 'Không tìm thấy thông tin lộ trình đã chọn.');
            return;
        }

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
                listScanQr.cpwId = segments[3];   // ID của checkpoint từ QR
                listScanQr.cpwCode = segments[4];
            } catch (e) {
                await presentAlert.presentAlert('Lỗi', '', 'Mã QR không hợp lệ');
                return;
            }
        }

        // --- BẮT ĐẦU LOGIC KIỂM TRA LỘ TRÌNH ---
        // 1. Tìm điểm tiếp theo cần phải quét (Điểm đầu tiên có status khác 1)
        const nextPointRequired = currentRoute.routeDetails.find((point: any) => point.status !== 1);

        if (!nextPointRequired) {
            await presentAlert.presentAlert('Thông báo', '', 'Lộ trình này đã được hoàn thành tất cả các điểm.');
            return;
        }

        // 2. Kiểm tra ID quét được có khớp với ID của điểm tiếp theo bắt buộc không
        if (String(listScanQr.cpwId) !== String(nextPointRequired.cpId)) {
            await presentAlert.presentAlert(
                'Sai thứ tự tuần tra',
                nextPointRequired.cpName,
                `Là điểm tiếp theo cần quét. Vui lòng đi đúng lộ trình.`,
                'custom-error-alert' // Thêm định danh class ở đây
            );
            return; // Chặn lại, không cho đi tiếp trang create nếu sai thứ tự
        }
        // --- KẾT THÚC LOGIC KIỂM TRA LỘ TRÌNH ---

        try {
            let finalData = null;
            const isOnline = store.state.isOnline;

            // Xử lý lấy dữ liệu Online/Offline (giữ nguyên logic cũ của bạn)
            if (isOnline) {
                try {
                    const res = await CheckPointScanQr.getCheckPointScanQr(listScanQr);
                    let actualData = res?.data?.data || res?.data;
                    if (Array.isArray(actualData)) actualData = actualData[0];
                    if (actualData) {
                        finalData = actualData;
                        await storageService.set(`checkpoint_${listScanQr.cpwId}`, actualData);
                    }
                } catch (e) {
                    console.warn("API lỗi, kiểm tra kho Offline");
                }
            }

            if (!finalData) {
                let response = await storageService.get('checkpoints');
                let allCheckpoints = Array.isArray(response) ? response : (response?.data || []);
                finalData = allCheckpoints.find((item: any) => String(item.cpId) === String(listScanQr.cpwId));
            }

            if (finalData) {
                // Kiểm tra AreaId (giữ nguyên logic của bạn)
                if (finalData.areaId !== dataUser.userAreaId) {
                    await presentAlert.presentAlert('Lỗi', '', `Mã QR không đúng khu vực!`);
                    return;
                }

                store.commit('SET_DATASCANQR', finalData);
                await storageService.set('data_scanqr', finalData);
                await storageService.set('currentTime_scanqr', currentTimeString);

                setTimeout(() => {
                    router.replace('/checkpoint/create');
                }, 100);
            } else {
                await presentAlert.presentAlert('Thông báo', '', 'Không tìm thấy thông tin điểm này trong dữ liệu hệ thống.');
            }
        } catch (error) {
            await presentAlert.presentAlert('Lỗi', '', 'Hệ thống không thể xử lý mã quét.');
        }
    }
};