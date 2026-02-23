import { createStore } from 'vuex'

// Tạo store mới
const store = createStore({
  // 1. State: Chứa dữ liệu (giống data)
  state() {
    return {
      dataListCP: null,
      dataUser: null,
      dataScanQr: null,
    }
  },

  // 2. Getters: Tính toán dữ liệu từ state (giống computed)
  getters: {},

  // 3. Mutations: Hàm đồng bộ duy nhất được phép thay đổi State
  mutations: {
    SET_DATACP(state, data) {
      state.dataListCP = data
    },
    SET_DATAUSER(state, data) {
      state.dataUser = data
    },
    SET_DATASCANQR(state, data) {
      state.dataScanQr = data
      console.log(state.dataScanQr)
    },
  },

  // 4. Actions: Xử lý bất đồng bộ (API call) rồi gọi mutation
  actions: {}
})

export default store