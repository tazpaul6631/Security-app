<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ dataPR.cpCode }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-searchbar 
      :debounce="1000"
      :search-icon="searchCircle" 
      placeholder="Custom Search Icon"
      @ionInput="handleInput($event)"></ion-searchbar>
    
      <ion-content>
      <ion-list>
        <ion-item 
          v-for="(item) in dataPR.details" 
          :button="true" 
          @click="handleLink(Number(item.prId))" 
          :key="item.prId"
          :class="item.prHasProblem ? 'custom-item-false' : 'custom-item-true'">
          <ion-grid>
            <ion-row>
              <ion-col size="auto">
                <ion-icon :icon="documentOutline"></ion-icon>
              </ion-col>
              <ion-col>
                <ion-label>{{ item.cpName }}</ion-label>
              </ion-col>
              <ion-col>
                <ion-label class="labelItem">{{ item.createdName }}</ion-label>
                <ion-label class="labelItem">{{ item.createdAt.split('T')[0] }}</ion-label>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-item>
      </ion-list>
      

      <ion-infinite-scroll @ionInfinite="ionInfinite">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
  
</template>

<script setup lang="ts">
import { documentOutline } from "ionicons/icons";
import router from '@/router';
import { 
    IonSearchbar,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonItem,
    IonLabel,
    InfiniteScrollCustomEvent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonPage,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon
 } from '@ionic/vue';
import { searchCircle } from 'ionicons/icons';
import { ref, computed, watch } from 'vue';

import { useStore } from 'vuex'

// Watch Store *****
const store = useStore()
const dataPR = ref<{ 
  cpCode: string; 
  details: {
    prId: string; 
    cpName: string; 
    createdName: string;
    createdAt:string;
    prHasProblem: boolean;
  }[] }>({
  cpCode: '',
  details: []
});

watch(
  () => store.state.dataListCP,
  () => {
    // Your function here
    dataPR.value = { cpCode: '', details: [] };
    const dataStore = computed(() => store.state.dataListCP)
    console.log(dataStore);
    
    for (const item of dataStore.value) {
      dataPR.value = {
        cpCode: item[0].cpCode,
        // map trả về một array các object
        details: item.map((cp: any) => ({
          prId: cp.prId,
          cpName: cp.cpName,
          createdName: cp.createdName,
          createdAt: cp.createdAt,
          prHasProblem: cp.prHasProblem
        }))
      }
    }
  }
)
//******>

//Search ******
const items = ref<string[]>([])
const results = ref<string[]>([])

const generateItems = () => {
  
    const count = items.value.length + 1
    for (let i = 0; i < 50; i++) {
        items.value.push( `Item ${count + i}` )
    }
}

const ionInfinite = (event: InfiniteScrollCustomEvent) => {
    // generateItems()
    // setTimeout(() => event.target.complete(), 500)
}

generateItems()

const handleInput = (event: any) => {
    const query = event.target.value.toLowerCase()
    
    if (query === '') {
        items.value.splice(0, items.value.length)
        generateItems()
    } else {
        results.value = items.value.filter((d) => d.toLowerCase().indexOf(query) > -1)
        items.value.splice(0, items.value.length, ...results.value)
    }
}
//*******>

//Link detail*****
const handleLink = (prId: number) => {
    router.replace({ path: `/checkpoint/detail/${prId}` })
}
//********>
</script>

<style scoped>
ion-col {
  justify-content: center;
  align-content: center;
  color: black;
}

.labelItem{
  --font-size: 13px;
}

.custom-item-true{
  --background: rgb(223, 253, 222);
}

.custom-item-false{
  --background: rgb(252, 238, 231);
}
</style>