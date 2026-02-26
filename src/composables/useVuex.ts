import { createStore } from 'vuex'
import storageService from '@/services/storage.service'

// Tạo store mới
const store = createStore({
  // 1. State: Chứa dữ liệu (giống data)
  state() {
    return {
      dataMenu: [],
      dataListCP: [],
      dataCheckpointsId: [],
      dataAreaBU: [],        
      dataUser: null,
      dataScanQr: null,
      token: null,
      currentTime: null,
      isHydrated: false,

      // Quản lý đồng bộ
      syncProgress: 0,
      syncMessage: '',
      isOnline: true,
      isSyncing: false,

      currentCheckpoint: null,
    }
  },

  // 2. Getters: Tính toán dữ liệu từ state (giống computed)
  getters: {},

  // 3. Mutations: Hàm đồng bộ duy nhất được phép thay đổi State
  mutations: {
    SET_DATAMENU(state, data) {
      state.dataMenu = data
    },
    SET_DATACP(state, data) {
      state.dataListCP = data
    },
    SET_DATA_CHECKPOINTS_ID(state, data) {
      state.dataCheckpointsId = data
    },
    SET_DATA_AREA_BU(state, data) {
      state.dataAreaBU = data
    },
    SET_DATAUSER(state, data) {
      state.dataUser = data
    },
    SET_DATASCANQR(state, data) {
      state.dataScanQr = data
    },
    SET_TOKEN(state, data) {
      state.token = data
    },
    SET_CURRENT_TIME(state, data) {
      state.currentTime = data
    },
    SET_HYDRATED(state, data) {
      state.isHydrated = data
    },
    SET_NETWORK_STATUS(state, status) {
      state.isOnline = status;
    },
    SET_SYNC_STATUS(state, { progress, message, isSyncing }) {
      state.syncProgress = progress;
      state.syncMessage = message;
      state.isSyncing = isSyncing;
    },
    SET_CURRENT_CHECKPOINT(state, data) {
      state.currentCheckpoint = data;
    },

    // 🚀 THÊM MỚI: Hàm bơm báo cáo Offline giả vào Store (Đã fix lỗi gạch chân)
    ADD_OFFLINE_REPORT(state: any, report: any) {
      // 1. Nhét vào kho tổng CheckpointsId (Bây giờ nó chắc chắn là Mảng)
      let allReports = Array.isArray(state.dataCheckpointsId) ? state.dataCheckpointsId : [];
      
      // Đẩy báo cáo mới lên đầu mảng và gán thẳng lại (Không cần .data nữa)
      state.dataCheckpointsId = [report, ...allReports];

      // 2. Nhét trực tiếp vào màn hình CPIndex hiện tại (nếu đang xem đúng khu vực đó)
      let currentCPList = [];
      if (Array.isArray(state.dataListCP)) {
        currentCPList = state.dataListCP[0]?.data || state.dataListCP;
      } else {
        currentCPList = state.dataListCP?.data || [];
      }
      
      // Nếu danh sách rỗng hoặc cpId trùng với màn hình đang xem thì bơm vào UI
      if (currentCPList.length === 0 || String(currentCPList[0]?.cpId) === String(report.cpId)) {
          currentCPList = [report, ...currentCPList];
          
          // Trả về đúng cấu trúc [{ data: [...] }] mà giao diện CPIndex đang mong đợi
          state.dataListCP = [{ data: currentCPList }];
      }
    },

    // Dùng để dọn sạch bộ nhớ RAM khi người dùng bấm Đăng Xuất
    CLEAR_ALL_DATA(state) {
      state.dataMenu = []
      state.dataListCP = []
      state.dataCheckpointsId = []
      state.dataAreaBU = []
      state.dataUser = null
      state.dataScanQr = null
      state.token = null
      state.currentTime = null
      state.isHydrated = true
      state.syncProgress = 0
      state.syncMessage = ''
      state.isSyncing = false
      state.currentCheckpoint = null
    }
  },

  // 4. Actions: Xử lý bất đồng bộ (API call) rồi gọi mutation
  actions: {
      async syncAllData({ commit }, apiList) {
        console.log('Bắt đầu đồng bộ Vuex...');
        
        // Thêm key 'mutation' để mapping tự động từ API -> SQLite -> Vuex
        const steps = [
          { name: 'CheckPoints', key: 'checkpoints', isLarge: false, mutation: 'SET_DATACP' },
          { name: 'CheckPointsId', key: 'checkpoints_id', isLarge: false, mutation: 'SET_DATA_CHECKPOINTS_ID' },
          { name: 'AreaBU', key: 'area_bu', isLarge: false, mutation: 'SET_DATA_AREA_BU' },
        ];

        commit('SET_SYNC_STATUS', { progress: 0, message: 'Khởi động đồng bộ...', isSyncing: true });

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const progress = Math.round((i / steps.length) * 100);

          commit('SET_SYNC_STATUS', { 
            progress, 
            message: `Đang tải ${step.name}...`, 
            isSyncing: true 
          });

          try {
              const apiFunc = apiList[step.key];
              if (typeof apiFunc !== 'function') {
                  console.warn(`Không tìm thấy hàm API cho key: ${step.key}`);
                  continue; 
              }

              const response = await apiFunc();
              const data = response?.data; 

              if (!data) {
                  console.warn(`Dữ liệu của ${step.name} trả về null/undefined`);
                  continue;
              }

              // 1. LƯU VÀO SQLITE
              if (step.isLarge && Array.isArray(data)) {
                  await Promise.all(data.map(item => {
                      const id = item.id || item.cpId || item.prId || item.userCode;
                      return storageService.set(`${step.key}_${id}`, item);
                  }));
              } else {
                  await storageService.set(step.key, data);
              }

              // 2. TỰ ĐỘNG COMMIT LÊN VUEX STATE
              if (step.mutation) {
                  commit(step.mutation, data);
              }

          } catch (error) {
              console.error(`Lỗi tại bước ${step.name}:`, error);
          }
        }

        commit('SET_SYNC_STATUS', { progress: 100, message: 'Đồng bộ hoàn tất!', isSyncing: false });
      },

      async initApp({ dispatch, commit }) {
        console.log('initApp running...');
        try {
          // Khôi phục tất cả dữ liệu cùng lúc
          await Promise.all([
            dispatch('restoreScanQr'),
            dispatch('restoreUser'),
            dispatch('restoreCurrentTime'),
            dispatch('restoreLastCheckpoint'),
            dispatch('restoreToken'),
            dispatch('restoreMenu'),
            // Thêm các hàm khôi phục dữ liệu đồng bộ
            dispatch('restoreCheckpoints'),
            dispatch('restoreCheckpointsId'),
            dispatch('restoreAreaBU')
          ]);
        } catch (e) {
          console.error("Lỗi khi khởi tạo Store:", e);
        } finally {
          commit('SET_HYDRATED', true);
        }
      },

      // --- CÁC HÀM RESTORE TỪ SQLITE LÊN VUEX KHI F5 ---

      async restoreCheckpoints({ commit, state }) {
        if (!state.dataListCP || state.dataListCP.length === 0) {
          let response = await storageService.get('checkpoints');
          
          // Đề phòng SQLite trả về chuỗi JSON thô
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) {}
          }

          const actualData = response?.data ? response.data : response;
          
          if (actualData) {
            commit('SET_DATACP', actualData);
            // THÊM DÒNG NÀY ĐỂ CHỨNG MINH DỮ LIỆU ĐÃ LÊN VUEX THÀNH CÔNG
            console.log('✅ ĐÃ BƠM AREA_BU VÀO VUEX:', actualData); 
          }
        }
      },

      async restoreCheckpointsId({ commit, state }) {
        if (!state.dataCheckpointsId || state.dataCheckpointsId.length === 0) {
          let response = await storageService.get('checkpoints_id');
          
          // Đề phòng SQLite trả về chuỗi JSON thô
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) {}
          }

          const actualData = response?.data ? response.data : response;
          
          if (actualData) {
            commit('SET_DATA_CHECKPOINTS_ID', actualData);
            // THÊM DÒNG NÀY ĐỂ CHỨNG MINH DỮ LIỆU ĐÃ LÊN VUEX THÀNH CÔNG
            console.log('✅ ĐÃ BƠM AREA_BU VÀO VUEX:', actualData); 
          }
        }
      },

      async restoreAreaBU({ commit, state }) {
        if (!state.dataAreaBU || state.dataAreaBU.length === 0) {
          let response = await storageService.get('area_bu');
          
          // Đề phòng SQLite trả về chuỗi JSON thô
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) {}
          }

          const actualData = response?.data ? response.data : response;
          
          if (actualData) {
            commit('SET_DATA_AREA_BU', actualData);
            // THÊM DÒNG NÀY ĐỂ CHỨNG MINH DỮ LIỆU ĐÃ LÊN VUEX THÀNH CÔNG
            console.log('✅ ĐÃ BƠM AREA_BU VÀO VUEX:', actualData); 
          }
        }
      },

      async restoreMenu({ commit, state }) {
        if (!state.dataMenu || state.dataMenu.length === 0) {
          const data = await storageService.get('menu_data'); 
          if (data) commit('SET_DATAMENU', data);
        }
      },

      async restoreToken({ commit, state }) {
        if (!state.token) {
          const data = await storageService.get('user_token'); 
          if (data) commit('SET_TOKEN', data);
          else commit('SET_TOKEN', null); 
        }
      },

      async restoreScanQr({ commit, state }) {
        if (!state.dataScanQr) {
          let response = await storageService.get('data_scanqr'); 
          
          // Đề phòng parse chuỗi JSON
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) {}
          }

          // 🚀 BÓC TÁCH AN TOÀN TRƯỚC KHI ĐẨY VÀO VUEX
          const actualData = response?.data ? response.data : response;
          
          if (actualData) commit('SET_DATASCANQR', actualData);
        }
      },

      async restoreUser({ commit, state }) {
        if (!state.dataUser) {
          let response = await storageService.get('user_data');
          
          // Đề phòng parse chuỗi JSON
          if (typeof response === 'string') {
            try { response = JSON.parse(response); } catch (e) {}
          }

          // 🚀 BÓC TÁCH AN TOÀN TRƯỚC KHI ĐẨY VÀO VUEX
          const actualData = response?.data ? response.data : response;
          if (actualData) commit('SET_DATAUSER', actualData);
        }
      },

      async restoreCurrentTime({ commit, state }) {
        if (!state.currentTime) {
          const data = await storageService.get('currentTime');
          if (data) commit('SET_CURRENT_TIME', data);
        }
      },

      async restoreLastCheckpoint({ commit }) {
        try {
          const data = await storageService.get('last_selected_checkpoint');
          if (data) commit('SET_CURRENT_CHECKPOINT', data);
        } catch (e) {
          console.error("Error restoring checkpoint:", e);
        }
      },
  }
})

export default store;