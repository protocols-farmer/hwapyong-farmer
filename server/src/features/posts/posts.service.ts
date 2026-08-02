//src/features/posts/posts.service.ts
import { pool } from "../../db/psql.js";
import type { CreatePostDTO } from "./posts.types.js";

export const postsService = {
  async getAllPosts(page: number = 1, limit: number = 12) {
    try {
      const offset = (page - 1) * limit;
      const countSql = "SELECT COUNT(*) FROM posts;";
      const dataSql = `
        SELECT p.*, u.username AS author_name, u.profile_title AS author_title, u.avatar_url AS author_avatar 
        FROM posts p
        JOIN users u ON p.author_id = u.id
        ORDER BY p.created_at DESC 
        LIMIT $1 OFFSET $2;
      `;

      const [countRes, dataRes] = await Promise.all([
        pool.query(countSql),
        pool.query(dataSql, [limit, offset]),
      ]);

      return {
        rows: dataRes.rows,
        totalCount: parseInt(countRes.rows[0]?.count || "0", 10),
      };
    } catch (err: any) {
      process.stderr.write(
        `[postsService.getAllPosts] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },

  async getPost(postId: string) {
    try {
      const sql = `
        SELECT p.*, u.username AS author_name, u.profile_title AS author_title, u.avatar_url AS author_avatar 
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = $1;
      `;
      return await pool.query(sql, [postId]);
    } catch (err: any) {
      process.stderr.write(
        `[postsService.getPost] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },

  async createPost(data: CreatePostDTO & { author_id: string }) {
    try {
      const sql = `
        INSERT INTO posts (
          author_id, category, subcategory, thumbnail, post_images, 
          title, short_description, main_content, tags, 
          external_link, github_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `;
      const values = [
        data.author_id,
        data.category,
        data.subcategory || null,
        data.thumbnail,
        data.post_images,
        data.title,
        data.short_description,
        data.main_content,
        data.tags,
        data.external_link || null,
        data.github_link || null,
      ];

      const insertResult = await pool.query(sql, values);

      if (insertResult.rows.length === 0) {
        throw new Error("Post creation failed, no rows returned.");
      }

      const newPostId = insertResult.rows[0].id;

      const fullPostSql = `
        SELECT p.*, u.username AS author_name, u.profile_title AS author_title, u.avatar_url AS author_avatar 
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = $1;
      `;

      return await pool.query(fullPostSql, [newPostId]);
    } catch (err: any) {
      process.stderr.write(
        `[postsService.createPost] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },

  async updatePost(setClause: string, params: any[]) {
    try {
      const sql = `
        UPDATE posts 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length}
        RETURNING *;
      `;
      const updateResult = await pool.query(sql, params);

      if (updateResult.rows.length === 0) {
        return updateResult;
      }

      const updatedPostId = updateResult.rows[0].id;

      const fullPostSql = `
        SELECT p.*, u.username AS author_name, u.profile_title AS author_title, u.avatar_url AS author_avatar 
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = $1;
      `;

      return await pool.query(fullPostSql, [updatedPostId]);
    } catch (err: any) {
      process.stderr.write(
        `[postsService.updatePost] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },

  async deletePost(postId: string) {
    try {
      return await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
    } catch (err: any) {
      process.stderr.write(
        `[postsService.deletePost] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },

  async getFilteredPosts(
    page: number = 1,
    limit: number = 12,
    searchQuery: string | null = null,
    category: string | null = null,
    subcategory: string | null = null,
    tagsArray: string[] | null = null,
    sortBy: string = "date",
    sortOrder: string = "DESC",
    authorId: string | null = null,
  ) {
    const client = await pool.connect();

    try {
      const offset = (page - 1) * limit;

      await client.query("BEGIN;");

      if (searchQuery && searchQuery.trim() !== "") {
        await client.query(
          "SET LOCAL pg_trgm.word_similarity_threshold = 0.3;",
        );
      }

      let whereClauses: string[] = [];
      let queryValues: any[] = [];
      let paramIndex = 1;

      if (authorId && authorId.trim() !== "") {
        whereClauses.push(`p.author_id = $${paramIndex}`);
        queryValues.push(authorId.trim());
        paramIndex++;
      }

      if (searchQuery && searchQuery.trim() !== "") {
        whereClauses.push(
          `(p.search_vector @@ websearch_to_tsquery('english', $${paramIndex}) OR $${paramIndex} <% p.title)`,
        );
        queryValues.push(searchQuery.trim());
        paramIndex++;
      }

      if (category && category !== "all" && category.trim() !== "") {
        whereClauses.push(`p.category = $${paramIndex}`);
        queryValues.push(category.trim());
        paramIndex++;
      }

      if (subcategory && subcategory.trim() !== "") {
        whereClauses.push(`p.subcategory = $${paramIndex}`);
        queryValues.push(subcategory.trim());
        paramIndex++;
      }

      if (tagsArray && tagsArray.length > 0) {
        whereClauses.push(`p.tags && $${paramIndex}::text[]`);
        queryValues.push(tagsArray);
        paramIndex++;
      }

      let whereString = "";
      if (whereClauses.length > 0) {
        whereString = "WHERE " + whereClauses.join(" AND ");
      }

      let orderString = "ORDER BY p.created_at DESC";
      if (sortBy === "title") {
        if (sortOrder === "ASC") {
          orderString = "ORDER BY p.title ASC";
        } else {
          orderString = "ORDER BY p.title DESC";
        }
      } else {
        if (sortOrder === "ASC") {
          orderString = "ORDER BY p.created_at ASC";
        } else {
          orderString = "ORDER BY p.created_at DESC";
        }
      }

      const countSql = `
        SELECT COUNT(*) 
        FROM posts p
        ${whereString};
      `;

      const dataSql = `
        SELECT p.*, u.username AS author_name, u.profile_title AS author_title, u.avatar_url AS author_avatar 
        FROM posts p
        JOIN users u ON p.author_id = u.id
        ${whereString}
        ${orderString}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
      `;

      const finalValues = [...queryValues, limit, offset];

      const [countRes, dataRes] = await Promise.all([
        client.query(countSql, queryValues),
        client.query(dataSql, finalValues),
      ]);

      await client.query("COMMIT;");

      return {
        rows: dataRes.rows,
        totalCount: parseInt(countRes.rows[0]?.count || "0", 10),
      };
    } catch (err: any) {
      await client.query("ROLLBACK;");

      process.stderr.write(
        `[postsService.getFilteredPosts] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    } finally {
      client.release();
    }
  },

  async getSuperAdminSeriousProjects(page: number = 1, limit: number = 12) {
    try {
      const offset = (page - 1) * limit;
      const countSql = `
        SELECT COUNT(p.id) FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.category = 'projects' AND p.subcategory = 'serious' AND u.role = 'super_admin';
      `;
      const dataSql = `
        SELECT p.*, u.username AS author_name, u.profile_title AS author_title, u.avatar_url AS author_avatar 
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.category = 'projects' AND p.subcategory = 'serious' AND u.role = 'super_admin'
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2;
      `;

      const [countRes, dataRes] = await Promise.all([
        pool.query(countSql),
        pool.query(dataSql, [limit, offset]),
      ]);

      return {
        rows: dataRes.rows,
        totalCount: parseInt(countRes.rows[0]?.count || "0", 10),
      };
    } catch (err: any) {
      process.stderr.write(
        `[postsService.getSuperAdminSeriousProjects] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },

  async getSuperAdminDiary(page: number = 1, limit: number = 12) {
    try {
      const offset = (page - 1) * limit;
      const countSql = `
        SELECT COUNT(p.id) FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.category = 'diary' AND u.role = 'super_admin';
      `;
      const dataSql = `
        SELECT p.*, u.username AS author_name, u.profile_title AS author_title, u.avatar_url AS author_avatar 
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.category = 'diary' AND u.role = 'super_admin'
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2;
      `;

      const [countRes, dataRes] = await Promise.all([
        pool.query(countSql),
        pool.query(dataSql, [limit, offset]),
      ]);

      return {
        rows: dataRes.rows,
        totalCount: parseInt(countRes.rows[0]?.count || "0", 10),
      };
    } catch (err: any) {
      process.stderr.write(
        `[postsService.getSuperAdminDiary] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },

  async getAllUniqueTags(
    category: string | null = null,
    subcategory: string | null = null,
    authorId: string | null = null,
  ) {
    try {
      let sql = "";
      let values: any[] = [];

      const hasCat = category && category !== "all" && category.trim() !== "";
      const hasSub = subcategory && subcategory.trim() !== "";
      const hasAuth = authorId && authorId.trim() !== "";

      if (hasCat && hasSub && hasAuth) {
        sql = `
          SELECT DISTINCT unnest(tags) AS tag 
          FROM posts 
          WHERE category = $1 AND subcategory = $2 AND author_id = $3
          ORDER BY tag ASC;
        `;
        values.push(category.trim(), subcategory.trim(), authorId.trim());
      } else if (hasCat && hasSub && !hasAuth) {
        sql = `
          SELECT DISTINCT unnest(tags) AS tag 
          FROM posts 
          WHERE category = $1 AND subcategory = $2
          ORDER BY tag ASC;
        `;
        values.push(category.trim(), subcategory.trim());
      } else if (hasCat && !hasSub && hasAuth) {
        sql = `
          SELECT DISTINCT unnest(tags) AS tag 
          FROM posts 
          WHERE category = $1 AND author_id = $2
          ORDER BY tag ASC;
        `;
        values.push(category.trim(), authorId.trim());
      } else if (hasCat && !hasSub && !hasAuth) {
        sql = `
          SELECT DISTINCT unnest(tags) AS tag 
          FROM posts 
          WHERE category = $1
          ORDER BY tag ASC;
        `;
        values.push(category.trim());
      } else if (!hasCat && !hasSub && hasAuth) {
        sql = `
          SELECT DISTINCT unnest(tags) AS tag 
          FROM posts 
          WHERE author_id = $1
          ORDER BY tag ASC;
        `;
        values.push(authorId.trim());
      } else {
        sql = `
          SELECT DISTINCT unnest(tags) AS tag 
          FROM posts 
          ORDER BY tag ASC;
        `;
      }

      const result = await pool.query(sql, values);

      const tagsList: string[] = [];

      for (const row of result.rows) {
        tagsList.push(row.tag);
      }

      return tagsList;
    } catch (err: any) {
      process.stderr.write(
        `[postsService.getAllUniqueTags] RAW DB ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      throw err;
    }
  },
};
