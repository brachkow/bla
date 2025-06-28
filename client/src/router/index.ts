import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        // Generate new session ID and redirect
        const sessionId = generateId()
        next(`/${sessionId}`)
      },
    },
    {
      path: '/:sessionId',
      name: 'chat',
      component: HomeView,
      props: true,
    },
  ],
})

export default router
