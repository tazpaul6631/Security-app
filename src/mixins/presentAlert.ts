import { alertController } from "@ionic/vue";

const presentAlert = async (h: string, m: string, cssClass: string = '') => {
    const alert = await alertController.create({ header: h, message: m, buttons: ['OK'], cssClass: cssClass });
    await alert.present();
};

export default {
    presentAlert
}