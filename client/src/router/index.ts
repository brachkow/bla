import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { customAlphabet } from 'nanoid'

const generateSessionId = () => {
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  return [nanoid(3), nanoid(3)].join('-')
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      beforeEnter: (to, from, next) => {
        // Generate new session ID and redirect
        const sessionId = generateSessionId()
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
