import { defineStore } from 'pinia';
import { ref } from 'vue';
import { circleApi } from '@/api/circle';
export const useCircleStore = defineStore('circle', () => {
    const circles = ref([]);
    const myCircles = ref([]);
    const currentCircle = ref(null);
    const circleDemands = ref([]);
    async function fetchCircles() {
        const res = await circleApi.list();
        circles.value = res.data.data;
    }
    async function fetchMyCircles() {
        const res = await circleApi.my();
        myCircles.value = res.data.data;
    }
    async function fetchCircle(id) {
        const res = await circleApi.get(id);
        currentCircle.value = res.data.data;
    }
    async function createCircle(data) {
        return circleApi.create(data);
    }
    async function joinByCode(code) {
        return circleApi.joinByCode(code);
    }
    async function fetchCircleDemands(circleId, page = 1) {
        const res = await circleApi.getDemands(circleId, page);
        circleDemands.value = res.data.data.demands;
        return res.data.data;
    }
    return { circles, myCircles, currentCircle, circleDemands, fetchCircles, fetchMyCircles, fetchCircle, createCircle, joinByCode, fetchCircleDemands };
});
//# sourceMappingURL=circle.js.map