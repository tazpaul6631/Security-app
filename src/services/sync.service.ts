import storageService from "./storage.service";
import AppSetting from "@/api/AppSetting";
import CheckPointScanQr from "@/api/CheckPointScanQr";
import Login from "@/api/Login";
import MenuCategory from "@/api/MenuCategory";
import PointReport from "@/api/PointReport";
import Role from "@/api/Role";
import RoleMenuCategory from "@/api/RoleMenuCategory";

export const syncAllData = async (store: any) => {
  const steps = [
    { name: 'Cấu hình hệ thống', api: AppSetting.postAppSettings, key: 'app_settings' },
    { name: 'Danh sách quyền', api: Role.postRole, key: 'roles' },
    { name: 'Danh mục Menu', api: MenuCategory.postMenuCategory, key: 'menu_structure' },
    { name: 'Phân quyền Menu', api: RoleMenuCategory.postRoleMenuCategory, key: 'role_menu_mapping' },
    { name: 'Danh sách nhân viên', api: Login.postUser, key: 'users', isLarge: true },
    { name: 'Dữ liệu điểm kiểm tra', api: CheckPointScanQr.postCheckPointView, key: 'checkpoints', isLarge: true },
    { name: 'Dữ liệu điểm kiểm tra id', api: PointReport.postPointReportView, key: 'checkpoints_id', isLarge: true },
  ];

  store.commit('SET_SYNC_STATUS', { progress: 0, message: 'Bắt đầu đồng bộ...', isSyncing: true });

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const currentProgress = Math.round(((i) / steps.length) * 100);
    
    store.commit('SET_SYNC_STATUS', { 
      progress: currentProgress, 
      message: `Đang tải ${step.name}...`, 
      isSyncing: true 
    });

    try {
      const response = await step.api();
      const data = response.data;

      // Lưu vào SQLite
      await storageService.set(step.key, data);

      // Nếu là dữ liệu lớn (CheckPoints/Users), xé nhỏ để truy vấn offline nhanh hơn
      if (step.isLarge && Array.isArray(data)) {
        for (const item of data) {
          const subKey = step.key === 'checkpoints' ? `checkpoint_${item.id}` : `user_${item.id}`;
          await storageService.set(subKey, item);
        }
      }
    } catch (error) {
      console.error(`Lỗi tải ${step.name}:`, error);
      // Có thể chọn tiếp tục hoặc dừng lại tùy độ quan trọng
    }
  }

  store.commit('SET_SYNC_STATUS', { progress: 100, message: 'Đồng bộ hoàn tất!', isSyncing: false });
};