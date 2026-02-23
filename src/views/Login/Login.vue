<template>
    <ion-page>
        <div class="flex-content">
            <ion-card>
                <ion-card-header collapse="condense">
                    <ion-card-title size="large">Login</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                    <ion-input
                        v-model="loginDetail.userCode"
                        ref="inputEmail"
                        label="Username" 
                        label-placement="floating" 
                        fill="outline" 
                        type="email"
                        placeholder="Enter Username"
                        :clear-input="true"
                        @ionInput="validateInput"></ion-input>
                
                    <br>

                    <ion-input
                        v-model="loginDetail.userPassword"
                        ref="inputPass"
                        label="Password" 
                        label-placement="floating" 
                        fill="outline" 
                        placeholder="Enter Password"
                        type="password"
                        @ionInput="validateInput">
                        <ion-input-password-toggle slot="end"></ion-input-password-toggle>
                    </ion-input>
                    
                    <!-- <ion-text v-if="arrayData.inputValidateEmail && arrayData.inputValidatePass" color="danger"><ion-icon :icon="warning"></ion-icon>Email or Password incorrect</ion-text> -->
                    <br>

                    <p v-if="errorMessage" style="color: red; text-align: center;">
                        {{ errorMessage }}
                    </p>


                    <ion-button :disabled="arrayData.checkedInput" @click="handleLogin" expand="block" color="success" class="text-white">Login</ion-button>
                </ion-card-content>
            </ion-card>

            <!-- <ion-loading
                :is-open="isLoading"
                message="Đang xác thực..."
            ></ion-loading>

            <ion-toast
                :is-open="!!errorMessage"
                :message="errorMessage"
                :duration="2000"
                color="danger"
                @didDismiss="errorMessage = ''"
            ></ion-toast> -->
        </div>
    </ion-page>
</template>

<script setup lang="ts">
import { 
    IonCardHeader, 
    IonCardTitle, 
    IonButton, 
    IonCard, 
    IonInput, 
    // IonIcon, 
    // IonText, 
    IonInputPasswordToggle,
    IonCardContent,
    IonPage,
    IonLoading,
    IonToast
} from '@ionic/vue';
// import { warning } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { reactive, ref } from 'vue';
import  Login from '@/api/Login'
import { useStore } from 'vuex';

const router = useRouter()

const inputEmail = ref()
const inputPass = ref()
const errorMessage = ref('')

const loginDetail = reactive({
    userCode: '',
    userPassword: '',
})

interface LoginResponse {
  success: boolean;
  data: ''; // Đây chính là thuộc tính 'data' bạn đang gọi
}

const storeLoginUser = ref<LoginResponse | null>(null);

//Check validate input **********
const arrayData = reactive ({
    checkedInput: true,
    inputValidateEmail: true,
    inputValidatePass: true
})

const validateInput = (event: any) => {
    const value = event.target.value
    const valueIpnut = event.target.label
    
    errorMessage.value = ''

    if (valueIpnut === 'Username' && value === '') {
        inputEmail.value.$el.classList.add('ion-invalid')
        inputEmail.value.$el.classList.add('ion-touched')
        arrayData.inputValidateEmail = true
        errorMessage.value = 'Code không được bỏ trống'
    } else if (valueIpnut === 'Username' && value !== '') {
        arrayData.inputValidateEmail = false
        inputEmail.value.$el.classList.remove('ion-invalid')
        inputEmail.value.$el.classList.remove('ion-touched')
    }
    
    if (valueIpnut === 'Password' && value === '') {
        inputPass.value.$el.classList.add('ion-invalid')
        inputPass.value.$el.classList.add('ion-touched')
        arrayData.inputValidatePass = true
        errorMessage.value = 'Password không được bỏ trống'
    } else if (valueIpnut === 'Password' && value !== '') {
        arrayData.inputValidatePass = false
        inputPass.value.$el.classList.remove('ion-invalid')
        inputPass.value.$el.classList.remove('ion-touched')
    }
        
    if (!arrayData.inputValidateEmail && !arrayData.inputValidatePass) {
        arrayData.checkedInput = false
    } else if (!arrayData.inputValidateEmail || !arrayData.inputValidatePass) {
        arrayData.checkedInput = true
    } else if (arrayData.inputValidateEmail && arrayData.inputValidatePass) {
        errorMessage.value = 'Code và Password không được bỏ trống'
    }
}
//*****************>9

//Gọi API login *************
const store = useStore();
const error = ref(null);
const isLoading = ref(false); 

const fetchUserValidate = async () => {
    isLoading.value = true
    error.value = null

    try {
        const responseBU = await Login.postUserValidate(loginDetail)
        storeLoginUser.value = responseBU.data
        console.log(storeLoginUser.value);
        
        if (responseBU.data.success) {
            // A. Lưu token hoặc trạng thái đăng nhập
            localStorage.setItem('user_token', 'fake-token-12345');

            if (storeLoginUser.value?.data) {
                console.log(storeLoginUser.value.data);
                
                store.commit('SET_DATAUSER', storeLoginUser.value?.data);
                console.log(store.state.dataUser);
                router.replace('/home');
            }
            
            console.log(store.state.dataUser);
            
        } else {
            errorMessage.value = 'Thông tin đăng nhập chưa tồn tại'
        }
    } catch (err) {
        console.error('API Error:', err)
        error.value = (err as any).response?.data?.message || 'Không thể lấy dữ liệu!'
    } finally {
        isLoading.value = false
    }
};

const handleLogin = async () => {
  try {
    // Reset lỗi
    errorMessage.value = '';

    // Gọi API 
    fetchUserValidate()

  } catch (error: any) {
    errorMessage.value = error.message || 'Đăng nhập thất bại';
    console.error(error);
  }
}
//*************>
</script>

<style scoped>
.flex-content {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}
</style>