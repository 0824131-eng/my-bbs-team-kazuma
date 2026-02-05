<script setup>
import { ref, onMounted, computed } from 'vue';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Heart,
  Loader2,
  MessageCircle,
  Folder,
  Tag,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  X,
  Paperclip,
} from 'lucide-vue-next';
import { supabase } from './supabaseClient';

const posts = ref([]);
const loading = ref(true);
const name = ref('');
// titleはUIからは消えますが、データ送信時の内部処理用に変数は残しておきます（デフォルト値用）
const title = ref('');
const content = ref('');

// ★カテゴリ設定
const categories = ['国語', '数学', '英語', 'その他'];
const currentCategory = ref('すべて');
const newPostCategory = ref('その他');

// ★メディアアップロード用
const fileInput = ref(null);
const selectedFile = ref(null);
const mediaType = ref(null); // 'image' or 'video'
const isUploading = ref(false);

const replyStates = ref({});

const fetchAllData = async () => {
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('Error fetching posts:', postsError);
    return;
  }

  const { data: repliesData, error: repliesError } = await supabase
    .from('replies')
    .select('*')
    .order('created_at', { ascending: true });

  if (repliesError) {
    console.error('Error fetching replies:', repliesError);
  }

  posts.value = postsData.map((post) => {
    const currentState = replyStates.value[post.id] || {
      name: '',
      content: '',
      isOpen: false,
    };
    replyStates.value[post.id] = currentState;

    return {
      ...post,
      replies: repliesData
        ? repliesData.filter((r) => r.post_id === post.id)
        : [],
    };
  });

  loading.value = false;
};

onMounted(() => {
  fetchAllData();

  const channel = supabase
    .channel('public:any')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      () => fetchAllData()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'replies' },
      () => fetchAllData()
    )
    .subscribe();
});

const filteredPosts = computed(() => {
  if (currentCategory.value === 'すべて') {
    return posts.value;
  }
  return posts.value.filter((post) => post.category === currentCategory.value);
});

// ファイル選択時の処理
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // サイズ制限 (例: 50MB)
  if (file.size > 50 * 1024 * 1024) {
    alert('ファイルサイズが大きすぎます (50MB以下にしてください)');
    return;
  }

  selectedFile.value = file;

  if (file.type.startsWith('image/')) {
    mediaType.value = 'image';
  } else if (file.type.startsWith('video/')) {
    mediaType.value = 'video';
  } else {
    mediaType.value = 'other';
  }
};

const clearFile = () => {
  selectedFile.value = null;
  mediaType.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleSubmit = async () => {
  if (!name.value.trim() || !content.value.trim()) return;

  isUploading.value = true;
  let uploadedMediaUrl = null;
  let uploadedMediaType = null;

  try {
    // ファイルがある場合はアップロード
    if (selectedFile.value) {
      const fileExt = selectedFile.value.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, selectedFile.value);

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
      uploadedMediaUrl = data.publicUrl;
      uploadedMediaType = mediaType.value;
    }

    // データベースに保存
    const { error } = await supabase.from('posts').insert([
      {
        name: name.value,
        title: title.value || 'Untitled', // タイトル入力がない場合は "Untitled" になります
        content: content.value,
        likes: 0,
        category: newPostCategory.value,
        media_url: uploadedMediaUrl, // ★追加
        media_type: uploadedMediaType, // ★追加
      },
    ]);

    if (error) throw error;

    // リセット
    title.value = '';
    content.value = '';
    clearFile();
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    isUploading.value = false;
  }
};

const handleReplySubmit = async (postId) => {
  const state = replyStates.value[postId];
  if (!state || !state.name.trim() || !state.content.trim()) return;

  const { error } = await supabase.from('replies').insert([
    {
      post_id: postId,
      name: state.name,
      content: state.content,
    },
  ]);

  if (error) {
    alert('Error: ' + error.message);
  } else {
    state.content = '';
  }
};

const toggleReplyArea = (postId) => {
  if (!replyStates.value[postId]) {
    replyStates.value[postId] = { name: '', content: '', isOpen: true };
  } else {
    replyStates.value[postId].isOpen = !replyStates.value[postId].isOpen;
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

const getCategoryColor = (cat) => {
  switch (cat) {
    case '国語':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    case '数学':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case '英語':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
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
        <div class="mt-2 mb-4 shrink-0">
          <h1
            class="text-4xl lg:text-5xl font-bold tracking-tight text-white mb-2"
          >
            TEAM<br />KAZUMA
          </h1>
          <p
            class="text-[#86868b] text-base lg:text-lg font-medium leading-relaxed"
          >
            Classroom Hub.
          </p>
        </div>

        <!-- フォームエリア -->
        <div class="flex-1 flex flex-col justify-center min-h-0">
          <div
            class="p-6 lg:p-8 rounded-3xl bg-[#1c1c1e] border border-white/5 shadow-2xl"
          >
            <h2
              class="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-4 flex items-center gap-2"
            >
              <Tag class="w-3 h-3" /> Create New Post
            </h2>
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <!-- カテゴリ選択 -->
              <div class="grid grid-cols-4 gap-2 mb-2">
                <button
                  v-for="cat in categories"
                  :key="cat"
                  type="button"
                  @click="newPostCategory = cat"
                  class="text-xs font-bold py-2 rounded-lg transition-all border"
                  :class="
                    newPostCategory === cat
                      ? 'bg-[#2997FF] text-white border-[#2997FF]'
                      : 'bg-[#2c2c2e] text-[#86868b] border-transparent hover:bg-[#3a3a3c]'
                  "
                >
                  {{ cat }}
                </button>
              </div>

              <div>
                <input
                  v-model="name"
                  type="text"
                  placeholder="Name"
                  class="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-3 outline-none placeholder:text-[#86868b] focus:ring-1 focus:ring-[#2997FF] transition-all border border-transparent text-sm"
                  required
                />
              </div>

              <!-- Subject欄を削除しました -->

              <div>
                <textarea
                  v-model="content"
                  placeholder="What's on your mind?"
                  class="w-full h-24 lg:h-32 bg-[#2c2c2e] text-white rounded-xl px-4 py-3 outline-none placeholder:text-[#86868b] resize-none focus:ring-1 focus:ring-[#2997FF] transition-all border border-transparent leading-relaxed text-sm"
                  required
                ></textarea>
              </div>

              <!-- ★ファイル選択エリア -->
              <div>
                <input
                  type="file"
                  ref="fileInput"
                  class="hidden"
                  accept="image/*,video/*"
                  @change="handleFileSelect"
                />

                <div v-if="!selectedFile" class="flex items-center">
                  <!-- デザイン変更: 黒背景でホバー時に灰色 -->
                  <button
                    type="button"
                    @click="triggerFileInput"
                    class="flex items-center gap-2 text-xs font-medium bg-black text-white border border-white/20 hover:bg-gray-700 transition-colors px-4 py-2 rounded-lg w-full justify-center"
                  >
                    <Paperclip class="w-4 h-4" />
                    <span>Add Image / Video</span>
                  </button>
                </div>

                <div
                  v-else
                  class="flex items-center justify-between bg-[#2c2c2e] px-3 py-2 rounded-lg border border-white/10 mt-2"
                >
                  <div class="flex items-center gap-2 overflow-hidden">
                    <ImageIcon
                      v-if="mediaType === 'image'"
                      class="w-4 h-4 text-[#2997FF]"
                    />
                    <div
                      v-else
                      class="text-xs font-bold text-[#2997FF] px-1 border border-[#2997FF] rounded"
                    >
                      VID
                    </div>
                    <span class="text-xs text-white truncate max-w-[150px]">{{
                      selectedFile.name
                    }}</span>
                  </div>
                  <button
                    type="button"
                    @click="clearFile"
                    class="text-[#86868b] hover:text-white"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="pt-1">
                <button
                  type="submit"
                  :disabled="isUploading"
                  class="w-full h-12 rounded-full bg-[#2997FF] hover:bg-[#0077ED] disabled:bg-[#2997FF]/50 text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span v-if="!isUploading">Post to {{ newPostCategory }}</span>
                  <span v-else class="flex items-center gap-2"
                    >Uploading <Loader2 class="w-4 h-4 animate-spin"
                  /></span>
                  <Send v-if="!isUploading" class="w-4 h-4" />
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
        <!-- ★タブナビゲーション -->
        <div
          class="flex items-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar sticky top-0 bg-black/95 backdrop-blur z-20 pt-2"
        >
          <button
            @click="currentCategory = 'すべて'"
            class="px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border"
            :class="
              currentCategory === 'すべて'
                ? 'bg-white text-black border-white'
                : 'bg-[#1c1c1e] text-[#86868b] border-white/5 hover:bg-[#2c2c2e]'
            "
          >
            All
          </button>
          <div class="w-px h-6 bg-[#3a3a3c] mx-1"></div>
          <button
            v-for="cat in categories"
            :key="cat"
            @click="currentCategory = cat"
            class="px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 border"
            :class="
              currentCategory === cat
                ? 'bg-[#2997FF] text-white border-[#2997FF]'
                : 'bg-[#1c1c1e] text-[#86868b] border-white/5 hover:bg-[#2c2c2e]'
            "
          >
            <Folder class="w-3 h-3" v-if="currentCategory !== cat" />
            <Folder class="w-3 h-3 fill-current" v-else />
            {{ cat }}
          </button>
        </div>

        <!-- スマホ用投稿フォーム -->
        <div
          class="md:hidden mb-8 p-6 rounded-3xl bg-[#1c1c1e] border border-white/10"
        >
          <h2 class="text-sm font-bold text-white mb-4">New Post</h2>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- スマホ用カテゴリ選択 -->
            <div class="flex gap-2 overflow-x-auto pb-2">
              <button
                v-for="cat in categories"
                :key="cat"
                type="button"
                @click="newPostCategory = cat"
                class="text-xs font-bold px-4 py-2 rounded-lg transition-all border whitespace-nowrap"
                :class="
                  newPostCategory === cat
                    ? 'bg-[#2997FF] text-white border-[#2997FF]'
                    : 'bg-[#2c2c2e] text-[#86868b] border-transparent'
                "
              >
                {{ cat }}
              </button>
            </div>

            <input
              v-model="name"
              type="text"
              placeholder="Name"
              class="w-full bg-[#2c2c2e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#86868b] border-none outline-none"
              required
            />
            <!-- Subject欄を削除しました -->
            <textarea
              v-model="content"
              placeholder="Message..."
              class="w-full h-24 bg-[#2c2c2e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#86868b] resize-none border-none outline-none"
              required
            ></textarea>

            <!-- スマホ用ファイル選択 -->
            <div class="flex items-center gap-2">
              <!-- デザイン変更 -->
              <button
                type="button"
                @click="triggerFileInput"
                class="bg-black text-white p-2 rounded-lg hover:bg-gray-700 transition-colors border border-white/10 flex items-center justify-center"
              >
                <Paperclip class="w-5 h-5" />
              </button>
              <span
                v-if="selectedFile"
                class="text-xs text-white truncate max-w-[150px]"
                >{{ selectedFile.name }}</span
              >
              <button
                v-if="selectedFile"
                type="button"
                @click="clearFile"
                class="text-[#86868b]"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              :disabled="isUploading"
              class="w-full py-3 rounded-full bg-[#2997FF] text-white font-medium text-sm disabled:opacity-50"
            >
              {{ isUploading ? 'Uploading...' : 'Post' }}
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
              v-for="post in filteredPosts"
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
                    <div class="flex items-center gap-2">
                      <div class="font-semibold text-white text-base">
                        {{ post.name }}
                      </div>
                      <span
                        class="text-[10px] font-bold px-2 py-0.5 rounded border"
                        :class="getCategoryColor(post.category)"
                      >
                        {{ post.category || 'その他' }}
                      </span>
                    </div>
                    <div class="text-xs text-[#86868b] mt-0.5">
                      {{ formatDate(post.created_at) }}
                    </div>
                  </div>
                </div>
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

              <!-- ★メディア表示エリア -->
              <div
                v-if="post.media_url"
                class="mb-4 rounded-2xl overflow-hidden border border-white/10"
              >
                <img
                  v-if="post.media_type === 'image'"
                  :src="post.media_url"
                  class="w-full h-auto max-h-[500px] object-cover"
                  loading="lazy"
                />
                <video
                  v-else-if="post.media_type === 'video'"
                  :src="post.media_url"
                  controls
                  class="w-full h-auto max-h-[500px]"
                  preload="metadata"
                ></video>
              </div>

              <div
                class="text-base leading-relaxed text-[#d1d1d6] whitespace-pre-wrap font-normal"
              >
                {{ post.content }}
              </div>

              <div class="mt-6 flex items-center justify-end gap-3">
                <button
                  @click="toggleReplyArea(post.id)"
                  class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all bg-[#2c2c2e] text-[#86868b] hover:bg-[#3a3a3c]"
                >
                  <MessageCircle class="w-4 h-4" />
                  <span v-if="replyStates[post.id]?.isOpen">Close Replies</span>
                  <span v-else
                    >Reply {{ post.replies ? post.replies.length : 0 }}</span
                  >
                  <ChevronUp
                    v-if="replyStates[post.id]?.isOpen"
                    class="w-3 h-3 ml-1"
                  />
                  <ChevronDown v-else class="w-3 h-3 ml-1" />
                </button>

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

              <!-- 返信エリア -->
              <div
                v-if="replyStates[post.id] && replyStates[post.id].isOpen"
                class="mt-6 pt-6 border-t border-white/10 animate-fade-in"
              >
                <div
                  v-if="post.replies && post.replies.length > 0"
                  class="space-y-4 mb-6"
                >
                  <div
                    v-for="reply in post.replies"
                    :key="reply.id"
                    class="flex gap-3 p-4 rounded-2xl bg-[#242426]"
                  >
                    <div
                      class="w-8 h-8 rounded-full bg-[#3a3a3c] flex items-center justify-center text-[#86868b] shrink-0"
                    >
                      <User class="w-4 h-4" />
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-bold text-white">{{
                          reply.name
                        }}</span>
                        <span class="text-[10px] text-[#636366]">{{
                          formatDate(reply.created_at)
                        }}</span>
                      </div>
                      <div class="text-sm text-[#d1d1d6] whitespace-pre-wrap">
                        {{ reply.content }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-3">
                  <div class="flex gap-3">
                    <input
                      v-model="replyStates[post.id].name"
                      type="text"
                      placeholder="Name"
                      class="w-1/3 bg-[#2c2c2e] text-white rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[#636366] focus:ring-1 focus:ring-[#2997FF]"
                    />
                    <input
                      v-model="replyStates[post.id].content"
                      type="text"
                      placeholder="Write a reply..."
                      class="flex-1 bg-[#2c2c2e] text-white rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[#636366] focus:ring-1 focus:ring-[#2997FF]"
                      @keydown.enter="handleReplySubmit(post.id)"
                    />
                    <button
                      @click="handleReplySubmit(post.id)"
                      class="bg-[#2997FF] hover:bg-[#0077ED] text-white p-2 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Send class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </transition-group>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
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
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
</style>
