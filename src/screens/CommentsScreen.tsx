import React, { useMemo, useRef } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { demoRecipes, type Creator, type OwnProfile, type RecipeComment, type SocialRecipe } from '../data/recipes';
import { commentAuthor, threadComments } from '../domain/commentThreads';
import { EmptyState, Icon, IconButton, feedback } from '../components/primitives';
import { useTheme, useThemeStyles, type ThemeColors } from '../theme';

export type CommentDraft = { text: string; replyToId?: string };

export type CommentsScreenProps = {
  recipe: SocialRecipe;
  profile: OwnProfile;
  comments: RecipeComment[];
  likedComments: string[];
  draft: CommentDraft;
  onDraftChange: (draft: CommentDraft) => void;
  onSubmit: (text: string, parentId?: string) => void;
  onLike: (commentId: string) => void;
  onProfile: (creator: Creator) => void;
};

export function CommentsScreen({ recipe, profile, comments, likedComments, draft, onDraftChange, onSubmit, onLike, onProfile }: CommentsScreenProps) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const text = draft.text;
  const replyingTo = comments.find(comment => comment.id === draft.replyToId) ?? null;
  const list = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const pendingScroll = useRef<string | true | null>(null);
  const positions = useRef<Record<string, number>>({});
  const threads = useMemo(() => threadComments(comments), [comments]);
  const creators = useMemo(() => [recipe.author, ...demoRecipes.map(item => item.author)], [recipe.author]);
  const authorOf = (comment: RecipeComment) => commentAuthor(comment, profile, creators);

  function reply(comment: RecipeComment) {
    feedback();
    onDraftChange({ text, replyToId: comment.id });
    input.current?.focus();
  }
  function send() {
    const message = text.trim();
    if (!message) return;
    pendingScroll.current = replyingTo?.id ?? true;
    onSubmit(message, replyingTo?.id);
    onDraftChange({ text: '' });
    input.current?.focus();
    feedback();
  }

  return <View style={styles.screen}>
    <View style={styles.recipe}>
      <Image source={recipe.image} style={styles.recipeImage}/>
      <View style={styles.recipeCopy}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Perfil de ${recipe.author.name}`} onPress={() => onProfile(recipe.author)} style={styles.recipeAuthorButton}>
          <Text style={styles.recipeAuthor}>Por {recipe.author.name}</Text>
        </Pressable>
      </View>
    </View>
    <ScrollView ref={list} style={styles.scroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} automaticallyAdjustKeyboardInsets={false}
      onContentSizeChange={() => {
        const target = pendingScroll.current;
        if (!target) return;
        pendingScroll.current = null;
        if (target === true) list.current?.scrollToEnd({ animated: true });
        else list.current?.scrollTo({ y: Math.max(0, (positions.current[target] ?? 0) - 15), animated: true });
      }}>
      {threads.length ? threads.map(({ comment, depth, replyTo }) => {
        const author = authorOf(comment);
        const liked = likedComments.includes(comment.id);
        const likeCount = (comment.likes || 0) + (liked ? 1 : 0);
        const targetName = replyTo ? authorOf(replyTo).name : '';
        return <View style={[styles.comment, depth > 0 && styles.reply]} key={comment.id} onLayout={event => { positions.current[comment.id] = event.nativeEvent.layout.y; }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${author.name}`} onPress={() => onProfile(author)} style={styles.avatarButton}>
            <Image source={{ uri: author.avatar }} style={styles.avatar}/>
          </Pressable>
          <View style={styles.commentCopy}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Perfil de ${author.name}: ${comment.text}`} onPress={() => onProfile(author)} style={styles.commentProfile}>
              <View style={styles.commentTop}>
                <Text style={styles.author}>{author.name}</Text>
                <Text style={styles.time}>{comment.time}</Text>
              </View>
              {replyTo && <Text style={styles.replyTo}>A {targetName}</Text>}
              <Text style={styles.text}>{comment.text}</Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Responder a ${author.name}`} onPress={() => reply(comment)} style={styles.replyButton}>
                <Text style={styles.actionLabel}>Responder</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`${liked ? 'Quitar me gusta' : 'Me gusta'} al comentario de ${author.name}`} accessibilityState={{ selected: liked }} onPress={() => { feedback(); onLike(comment.id); }} style={[styles.likeButton, liked && styles.likeButtonActive]}>
                <Icon name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? colors.red : colors.muted}/>
                {!!likeCount && <Text style={[styles.likeCount, liked && { color: colors.red }]}>{likeCount}</Text>}
              </Pressable>
            </View>
          </View>
        </View>;
      }) : <EmptyState icon="chatbubbles-outline" title="Aquí empieza la sobremesa." body="Sé el primero en contar qué te parece esta receta."/>}
    </ScrollView>
    {replyingTo && <View style={styles.replyingBar}>
      <View style={styles.replyingCopy}>
        <Text style={styles.replyingLabel}>Respondiendo a {authorOf(replyingTo).name}</Text>
        <Text style={styles.replyingPreview} numberOfLines={1}>{replyingTo.text}</Text>
      </View>
      <IconButton name="close" label="Cancelar respuesta" size={34} onPress={() => onDraftChange({ text })}/>
    </View>}
    <View style={styles.form}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ver mi perfil" onPress={() => onProfile({ ...profile, id: 'me', followers: '0' })} style={styles.avatarButton}>
        <Image source={{ uri: profile.avatar }} style={styles.avatar}/>
      </Pressable>
      <TextInput ref={input} accessibilityLabel={replyingTo ? 'Tu respuesta' : 'Tu comentario'} placeholder={replyingTo ? 'Escribe tu respuesta…' : 'Comparte el antojo…'} placeholderTextColor={colors.muted} value={text} onChangeText={next => onDraftChange({ ...draft, text: next })} maxLength={700} style={styles.input} multiline/>
      <Pressable accessibilityRole="button" accessibilityLabel={replyingTo ? 'Publicar respuesta' : 'Publicar comentario'} accessibilityState={{ disabled: !text.trim() }} disabled={!text.trim()} onPress={send} style={[styles.send, !text.trim() && styles.sendDisabled]}>
        <Icon name="arrow-up" size={21} color={colors.onPrimary}/>
      </Pressable>
    </View>
  </View>;
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  scroll: { flex: 1, minHeight: 0 },
  recipe: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 21, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  recipeImage: { width: 48, height: 56, borderRadius: 12, backgroundColor: colors.surface },
  recipeCopy: { flex: 1 },
  recipeTitle: { fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: '600' },
  recipeAuthorButton: { alignSelf: 'flex-start', minHeight: 30, justifyContent: 'center', borderRadius: 999 },
  recipeAuthor: { fontSize: 11, color: colors.muted },
  list: { paddingHorizontal: 20, paddingTop: 23, paddingBottom: 25, gap: 21 },
  comment: { flexDirection: 'row', gap: 11 },
  reply: { marginLeft: 31, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border },
  avatarButton: { width: 36, height: 36, borderRadius: 999, overflow: 'hidden' },
  avatar: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.raised },
  commentCopy: { flex: 1, minWidth: 0 },
  commentProfile: { minHeight: 44, borderRadius: 15 },
  commentTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  author: { fontSize: 12, lineHeight: 18, color: colors.text, fontWeight: '600' },
  time: { fontSize: 10, color: colors.muted },
  text: { fontSize: 13, lineHeight: 20, color: colors.text, marginTop: 7 },
  replyTo: { fontSize: 10, color: colors.muted, marginTop: 7 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  replyButton: { minHeight: 40, borderRadius: 999, paddingRight: 10, justifyContent: 'center' },
  actionLabel: { fontSize: 11, color: colors.muted, fontWeight: '500' },
  likeButton: { minWidth: 40, minHeight: 36, paddingHorizontal: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  likeButtonActive: { backgroundColor: colors.redTint },
  likeCount: { fontSize: 11, color: colors.muted },
  replyingBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  replyingCopy: { flex: 1 },
  replyingLabel: { fontSize: 11, fontWeight: '600', color: colors.red },
  replyingPreview: { marginTop: 5, fontSize: 11, color: colors.muted },
  form: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 17, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
  input: { flex: 1, minHeight: 43, maxHeight: 113, fontSize: 13, lineHeight: 19, color: colors.text, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 11, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  send: { width: 43, height: 43, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.redDark : colors.red },
  sendDisabled: { opacity: .35 },
});
