import { defineStore } from 'pinia';
import { ref } from 'vue';
import { circleApi } from '@/api/circle';

export const useCircleStore = defineStore('circle', () => {
  const circles = ref<any[]>([]);
  const myCircles = ref<any[]>([]);
  const currentCircle = ref<any>(null);
  const circleDemands = ref<any[]>([]);

  async function fetchCircles() {
    const res = await circleApi.list();
    circles.value = res.data.data;
  }

  async function fetchMyCircles() {
    const res = await circleApi.my();
    myCircles.value = res.data.data;
  }

  async function fetchCircle(id: string) {
    const res = await circleApi.get(id);
    currentCircle.value = res.data.data;
  }

  async function createCircle(data: { name: string; description?: string }) {
    return circleApi.create(data);
  }

  async function joinByCode(code: string) {
    return circleApi.joinByCode(code);
  }

  async function fetchCircleDemands(circleId: string, page = 1) {
    const res = await circleApi.getDemands(circleId, page);
    circleDemands.value = res.data.data.demands;
    return res.data.data;
  }

  return { circles, myCircles, currentCircle, circleDemands, fetchCircles, fetchMyCircles, fetchCircle, createCircle, joinByCode, fetchCircleDemands };
});
