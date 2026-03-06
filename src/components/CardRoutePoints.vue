<template>
    <div v-if="details && details.length > 0" class="points-grid">
        <div v-for="(point, idx) in details" :key="point.rdId" class="grid-item-wrapper">

            <div class="point-node" :class="{
                'done': point.status === 1,
                'next-step': isCurrentStep(idx)
            }">
                <div class="mini-thumb">
                    <ion-icon class="points-icon" :icon="libraryOutline"></ion-icon>
                    <div v-if="point.status === 1" class="check-icon">
                        <ion-icon :icon="checkmark"></ion-icon>
                    </div>
                </div>
                <span class="point-number" :class="{
                    'done': point.status === 1
                }">{{ idx + 1 }}</span>
            </div>

            <div v-if="(idx + 1) % 4 !== 0 && idx !== details.length - 1" class="h-line"
                :class="{ 'active': point.status === 1 }">
            </div>

            <div class="point-label">{{ point.cpName }}</div>
        </div>
    </div>

    <div v-else class="no-points">
        Không có dữ liệu điểm tuần tra.
    </div>
</template>

<script setup lang="ts">
import { checkmark, libraryOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/vue';

// 1. Định nghĩa Interface cho Props
interface RouteDetail {
    rdId: number | string;
    cpId: number | string;
    cpName: string;
    status: number;
}

// 2. Nhận dữ liệu từ trang cha (RouteIndex.vue)
const props = defineProps<{
    details: RouteDetail[]
}>();

/**
 * 3. Kiểm tra điểm hiện tại cần thực hiện (Điểm đầu tiên có status != 1)
 */
const isCurrentStep = (index: number): boolean => {
    if (!props.details) return false;
    const firstIncomplete = props.details.findIndex((p: RouteDetail) => p.status !== 1);
    return index === firstIncomplete;
};
</script>

<style scoped>
.points-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px 5px;
    padding: 15px 0;
}

.grid-item-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
}

.point-node {
    width: 45px;
    height: 45px;
    position: relative;
    border-radius: 12px;
    padding: 2px;
    border: 2px solid #e0e0e0;
    transition: all 0.3s ease;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
}

.point-node.done {
    border-color: var(--ion-color-success);
    background: #f6ffed;
}

/* Điểm kế tiếp cần quét - Hiệu ứng nhấp nháy */
.point-node.next-step {
    border-color: var(--ion-color-warning);
    border-style: dashed;
    animation: pulse-orange 2s infinite;
}

.point-number {
    position: absolute;
    bottom: -6px;
    right: -6px;
    background: #999;
    color: white;
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 10px;
    border: 1.5px solid white;
    font-weight: bold;
}

.point-number.done {
    background: var(--ion-color-success);
}

.point-node.next-step .point-number {
    background: var(--ion-color-warning);
}

.points-icon {
    font-size: 24px;
    color: #ccc;
}

.point-node.done .points-icon {
    color: var(--ion-color-success);
}

.check-icon {
    position: absolute;
    top: -5px;
    left: -5px;
    background: var(--ion-color-success);
    border-radius: 50%;
    color: white;
    display: flex;
    padding: 2px;
    font-size: 10px;
    border: 1px solid white;
}

.point-label {
    margin-top: 8px;
    font-size: 0.6rem;
    color: #444;
    text-align: center;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.2;
    max-width: 65px;
    height: 1.5rem;
}

/* Đường nối giữa các điểm */
.h-line {
    background: #eee;
    position: absolute;
    top: 22px;
    right: -25%;
    /* Căn giữa khoảng cách giữa 2 node */
    width: 50%;
    height: 2px;
    z-index: 0;
}

.h-line.active {
    background: var(--ion-color-success);
}

.no-points {
    text-align: center;
    padding: 20px;
    color: #999;
    font-style: italic;
}

@keyframes pulse-orange {
    0% {
        box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
        transform: scale(1);
    }

    70% {
        box-shadow: 0 0 0 8px rgba(255, 152, 0, 0);
        transform: scale(1.05);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
        transform: scale(1);
    }
}
</style>