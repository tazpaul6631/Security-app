<template>
  <ion-page> 
    <ion-header>
      <ion-toolbar>
        <ion-title>Trang Chủ</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="welcome-text">
        <h1>Chào mừng, {{ store.state.dataUser?.userName }}</h1>
        <p>Hệ thống giám sát an ninh - Security App</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent 
} from '@ionic/vue';
import { useStore } from 'vuex';

const store = useStore();
</script>