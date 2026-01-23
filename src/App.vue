<script setup>
import { ref, onMounted } from 'vue';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Heart,
  Loader2,
} from 'lucide-vue-next';
import { supabase } from './supabaseClient';

const posts = ref([]);
const loading = ref(true);
const name = ref('');
const title = ref('');
const content = ref('');

const fetchPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) console.error('Error:', error);
  else posts.value = data || [];
  loading.value = false;
};

onMounted(() => {
  fetchPosts();
  const channel = supabase
    .channel('public:posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      () => {
        fetchPosts();
      }
    )
    .subscribe();
});

const handleSubmit = async () => {
  if (!name.value.trim() || !content.value.trim()) return;
  const { error } = await supabase
    .from('posts')
    .insert([
      {
        name: name.value,
        title: title.value || 'Untitled',
        content: content.value,
        likes: 0,
      },
    ]);
  if (error) alert('Error: ' + error.message);
  else {
    title.value = '';
    content.value = '';
  }
};

const handleLike = async (post) => {
  await supabase
    .from('posts')
    .update({ likes: (post.likes || 0) + 1 })
    .eq('id', post.id);
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>

<template>
  <div
    class="min-h-screen bg-black text-[#F5F5F7] font-sans selection:bg-[#2997FF] selection:text-white"
  >
    <!-- スマホ専用ヘッダー -->
    <nav
      class="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 h-14 flex items-center justify-between px-4"
    >
      <div class="font-semibold text-lg tracking-tight">TEAM KAZUMA</div>
      <div
        class="text-xs font-medium text-gray-400 bg-[#1c1c1e] px-3 py-1 rounded-full border border-white/10"
      >
        {{ posts.length }} Posts
      </div>
    </nav>

    <!-- メインレイアウト -->
    <div
      class="max-w-screen-2xl mx-auto md:flex min-h-screen md:h-screen md:overflow-hidden pt-14 md:pt-0"
    >
      <!-- ★左パネル (PC専用・固定エリア) -->
      <aside
        class="hidden md:flex flex-col w-[380px] lg:w-[450px] h-full bg-black border-r border-white/10 z-10 p-6 lg:p-8 relative overflow-hidden justify-between"
      >
        <!-- タイトルエリア -->
        <div class="mt-2 mb-4 shrink-0">
          <h1
            class="text-4xl lg:text-5xl font-bold tracking-tight text-white mb-2"
          >
            TEAM<br />KAZUMA
          </h1>
          <p
            class="text-[#86868b] text-base lg:text-lg font-medium leading-relaxed"
          >
            Designed for focus.
          </p>
        </div>

        <!-- フォームエリア -->
        <div class="flex-1 flex flex-col justify-center min-h-0">
          <div
            class="p-6 lg:p-8 rounded-3xl bg-[#1c1c1e] border border-white/5 shadow-2xl"
          >
            <h2
              class="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-4"
            >
              Create New Post
            </h2>
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div>
                <input
                  v-model="name"
                  type="text"
                  placeholder="Name"
                  class="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-3 outline-none placeholder:text-[#86868b] focus:ring-1 focus:ring-[#2997FF] transition-all border border-transparent text-sm"
                  required
                />
              </div>

              <div>
                <input
                  v-model="title"
                  type="text"
                  placeholder="Subject"
                  class="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-3 outline-none placeholder:text-[#86868b] focus:ring-1 focus:ring-[#2997FF] transition-all border border-transparent text-sm"
                />
              </div>

              <div>
                <textarea
                  v-model="content"
                  placeholder="What's on your mind?"
                  class="w-full h-24 lg:h-32 bg-[#2c2c2e] text-white rounded-xl px-4 py-3 outline-none placeholder:text-[#86868b] resize-none focus:ring-1 focus:ring-[#2997FF] transition-all border border-transparent leading-relaxed text-sm"
                  required
                ></textarea>
              </div>

              <div class="pt-1">
                <button
                  type="submit"
                  class="w-full h-12 rounded-full bg-[#2997FF] hover:bg-[#0077ED] text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span>Post</span>
                  <Send class="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <footer class="mt-4 text-xs text-[#86868b] shrink-0">
          &copy; 2024 TEAM KAZUMA
        </footer>
      </aside>

      <!-- ★右パネル (スクロールエリア) -->
      <main
        class="flex-1 min-w-0 md:h-full md:overflow-y-auto bg-black p-4 md:p-12 lg:p-16"
      >
        <!-- スマホ用投稿フォーム -->
        <div
          class="md:hidden mb-8 p-6 rounded-3xl bg-[#1c1c1e] border border-white/10"
        >
          <h2 class="text-sm font-bold text-white mb-4">New Post</h2>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <input
              v-model="name"
              type="text"
              placeholder="Name"
              class="w-full bg-[#2c2c2e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#86868b] border-none outline-none"
              required
            />
            <input
              v-model="title"
              type="text"
              placeholder="Subject"
              class="w-full bg-[#2c2c2e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#86868b] border-none outline-none"
            />
            <textarea
              v-model="content"
              placeholder="Message..."
              class="w-full h-24 bg-[#2c2c2e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#86868b] resize-none border-none outline-none"
              required
            ></textarea>
            <button
              type="submit"
              class="w-full py-3 rounded-full bg-[#2997FF] text-white font-medium text-sm"
            >
              Post
            </button>
          </form>
        </div>

        <div v-if="loading" class="text-center py-20">
          <Loader2 class="w-8 h-8 animate-spin mx-auto text-[#86868b]" />
        </div>

        <!-- 投稿リスト -->
        <div class="max-w-3xl space-y-6">
          <transition-group name="list">
            <article
              v-for="post in posts"
              :key="post.id"
              class="group relative rounded-3xl bg-[#1c1c1e] p-8 transition-all hover:bg-[#2c2c2e] border border-white/5"
            >
              <div class="flex justify-between items-start mb-5">
                <div class="flex items-center gap-4">
                  <div
                    class="w-10 h-10 rounded-full bg-[#2c2c2e] flex items-center justify-center text-[#86868b] group-hover:bg-[#3a3a3c] transition-colors border border-white/5"
                  >
                    <User class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="font-semibold text-white text-base">
                      {{ post.name }}
                    </div>
                    <div class="text-xs text-[#86868b]">
                      {{ formatDate(post.created_at) }}
                    </div>
                  </div>
                </div>

                <!-- 削除ボタンがあった場所 (削除済み) -->
              </div>

              <h3
                v-if="
                  post.title &&
                  post.title !== 'Untitled' &&
                  post.title !== '無題'
                "
                class="text-lg font-bold mb-3 text-white tracking-tight"
              >
                {{ post.title }}
              </h3>

              <div
                class="text-base leading-relaxed text-[#d1d1d6] whitespace-pre-wrap font-normal"
              >
                {{ post.content }}
              </div>

              <div class="mt-6 flex items-center justify-end">
                <button
                  @click="handleLike(post)"
                  class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  :class="
                    post.likes > 0
                      ? 'bg-[#FF453A]/10 text-[#FF453A]'
                      : 'bg-[#2c2c2e] text-[#86868b] hover:bg-[#3a3a3c]'
                  "
                >
                  <Heart
                    class="w-4 h-4"
                    :class="{ 'fill-current': post.likes > 0 }"
                  />
                  <span>{{ post.likes || 0 }}</span>
                </button>
              </div>
            </article>
          </transition-group>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
/* index.htmlの設定が強すぎる場合の保険として、ここでも強制的に背景色を上書きします */
html,
body {
  background-color: #000000 !important;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
