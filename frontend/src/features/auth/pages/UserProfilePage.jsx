import React, { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { useNavigate, useParams } from 'react-router-dom';
import AdminNavbar from '../../../shared/components/AdminNavbar';
import {
  apiPath,
  authFetch,
  getStoredUser,
  hostPath,
  storeAuthSession,
} from '../../../shared/utils/api';
import { createCroppedAvatarFile } from './avatarCropUtils';
import './UserProfilePage.css';

const emptyProfileForm = {
  name: '',
  email: '',
  address: '',
  bio: '',
};

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const emptyVerificationForm = {
  code: '',
};

const profileTabs = [
  {
    id: 'info',
    label: 'Thông tin',
    description: 'Avatar, liên hệ và giới thiệu',
  },
  {
    id: 'security',
    label: 'Bảo mật',
    description: 'Mật khẩu và xác thực email',
  },
];

const mapUserToProfileForm = (user) => ({
  name: String(user?.name || '').trim(),
  email: String(user?.email || '').trim(),
  address: String(user?.address || '').trim(),
  bio: String(user?.bio || '').trim(),
});

const normalizeProfileForm = (form = emptyProfileForm) => ({
  name: String(form.name || '').trim(),
  email: String(form.email || '').trim(),
  address: String(form.address || '').trim(),
  bio: String(form.bio || '').trim(),
});

const areProfileFormsEqual = (left, right) => {
  const nextLeft = normalizeProfileForm(left);
  const nextRight = normalizeProfileForm(right);

  return (
    nextLeft.name === nextRight.name &&
    nextLeft.email === nextRight.email &&
    nextLeft.address === nextRight.address &&
    nextLeft.bio === nextRight.bio
  );
};

const formatMemberDate = (value) => {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật';
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getRoleLabel = (role) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'teacher':
      return 'Teacher';
    default:
      return 'Student';
  }
};

const getInitials = (name) => {
  const tokens = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return 'U';

  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
};

const syncStoredProfile = (updatedUser) => {
  if (!updatedUser) return;

  const storedUser = getStoredUser() || {};
  storeAuthSession({ user: { ...storedUser, ...updatedUser } });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:changed'));
  }
};

const createMessage = (type, message) => ({ type, message });

const getEmailVerificationTone = (user) => {
  if (!user?.email) return 'muted';
  if (user?.emailVerifiedAt) return 'verified';
  return 'warning';
};

const getEmailVerificationLabel = (user) => {
  if (!user?.email) return 'Chưa có email';
  if (user?.emailVerifiedAt) return 'Email đã xác thực';
  return 'Email chưa xác thực';
};

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const viewerUser = getStoredUser();
  const isOwnProfile = !userId || String(userId) === String(viewerUser?.id);
  const isAdminReviewMode = Boolean(userId) && !isOwnProfile;

  const [profile, setProfile] = useState(() => (isOwnProfile ? getStoredUser() : null));
  const [profileForm, setProfileForm] = useState(() => mapUserToProfileForm(isOwnProfile ? getStoredUser() : null));
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [verificationForm, setVerificationForm] = useState(emptyVerificationForm);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationConfirming, setVerificationConfirming] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [messageState, setMessageState] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [cropAsset, setCropAsset] = useState(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef(null);

  const currentUser = profile || (isOwnProfile ? viewerUser : null);
  const canEditProfile = isOwnProfile;
  const canManageAvatar = isOwnProfile;
  const canChangePassword = isOwnProfile;
  const canVerifyEmail = isOwnProfile;
  const profileChanged = canEditProfile && !areProfileFormsEqual(profileForm, mapUserToProfileForm(profile));
  const isTeacherShell = viewerUser?.role === 'teacher' || viewerUser?.role === 'admin';
  const avatarUrl = currentUser?.avatarUrl ? hostPath(currentUser.avatarUrl) : null;
  const initials = getInitials(currentUser?.name);
  const roleLabel = getRoleLabel(currentUser?.role);
  const bioCount = profileForm.bio.length;
  const emailVerificationTone = getEmailVerificationTone(currentUser);
  const emailVerificationLabel = getEmailVerificationLabel(currentUser);
  const hasEmail = Boolean(String(currentUser?.email || '').trim());
  const isEmailVerified = Boolean(currentUser?.emailVerifiedAt);
  const emailDirty = normalizeProfileForm(profileForm).email !== String(currentUser?.email || '').trim();

  const closeCropModal = () => {
    setCropAsset((current) => {
      if (current?.src && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(current.src);
      }

      return null;
    });
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedAreaPixels(null);
  };

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setActiveTab('info');
        const endpoint = isOwnProfile
          ? apiPath('auth/me')
          : apiPath(`admin/users/${userId}/profile`);
        const res = await authFetch(endpoint);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || 'Không thể tải hồ sơ người dùng.');
        }

        if (!active) return;

        const nextUser = data.user || getStoredUser();
        setProfile(nextUser);
        setProfileForm(mapUserToProfileForm(nextUser));
        setPasswordForm(emptyPasswordForm);
        setVerificationForm(emptyVerificationForm);
        if (isOwnProfile) {
          syncStoredProfile(nextUser);
        }
      } catch (err) {
        if (!active) return;
        setMessageState(
          createMessage(
            'error',
            err.message || 'Không thể tải hồ sơ người dùng.'
          )
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [isOwnProfile, userId]);

  useEffect(() => () => {
    closeCropModal();
  }, []);

  const handleProfileFieldChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handleVerificationFieldChange = (event) => {
    const { name, value } = event.target;
    setVerificationForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!canEditProfile) {
      return;
    }

    const normalizedProfile = normalizeProfileForm(profileForm);

    if (!normalizedProfile.name) {
      setMessageState(createMessage('error', 'Tên hiển thị không được để trống.'));
      return;
    }

    if (!profileChanged) {
      setMessageState(createMessage('success', 'Hồ sơ hiện đã đồng bộ.'));
      return;
    }

    try {
      setProfileSaving(true);
      setMessageState(null);

      const res = await authFetch(apiPath('auth/me'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedProfile),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Không thể cập nhật hồ sơ.');
      }

      const nextUser = data.user || currentUser;
      setProfile(nextUser);
      setProfileForm(mapUserToProfileForm(nextUser));
      syncStoredProfile(nextUser);
      setMessageState(
        createMessage(
          'success',
          data.message || 'Cập nhật hồ sơ thành công.'
        )
      );
    } catch (err) {
      setMessageState(
        createMessage('error', err.message || 'Không thể cập nhật hồ sơ.')
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (!canChangePassword) {
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessageState(
        createMessage('error', 'Mật khẩu mới phải có ít nhất 6 ký tự.')
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessageState(
        createMessage('error', 'Mật khẩu xác nhận chưa khớp.')
      );
      return;
    }

    try {
      setPasswordSaving(true);
      setMessageState(null);

      const res = await authFetch(apiPath('auth/me/password'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Không thể đổi mật khẩu.');
      }

      setPasswordForm(emptyPasswordForm);
      setMessageState(
        createMessage('success', data.message || 'Đổi mật khẩu thành công.')
      );
    } catch (err) {
      setMessageState(
        createMessage('error', err.message || 'Không thể đổi mật khẩu.')
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePickAvatar = () => {
    if (!canManageAvatar) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!canManageAvatar) {
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      setMessageState(createMessage('error', 'Vui lòng chọn một file ảnh hợp lệ.'));
      return;
    }

    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setMessageState(createMessage('error', 'Trình duyệt hiện tại không hỗ trợ xem trước ảnh.'));
      return;
    }

    closeCropModal();
    setMessageState(null);
    setCropAsset({
      file,
      src: URL.createObjectURL(file),
    });
  };

  const uploadAvatarFile = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await authFetch(apiPath('auth/me/avatar'), {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || 'Không thể cập nhật avatar.');
    }

    const nextUser = data.user || currentUser;
    setProfile(nextUser);
    syncStoredProfile(nextUser);
    setMessageState(
      createMessage('success', data.message || 'Cập nhật avatar thành công.')
    );
  };

  const handleApplyAvatarCrop = async () => {
    if (!cropAsset?.file || !croppedAreaPixels) {
      setMessageState(createMessage('error', 'Vui lòng chọn vùng crop trước khi lưu avatar.'));
      return;
    }

    try {
      setAvatarSaving(true);
      setMessageState(null);

      const croppedFile = await createCroppedAvatarFile(
        cropAsset.src,
        croppedAreaPixels,
        cropAsset.file
      );
      await uploadAvatarFile(croppedFile);
      closeCropModal();
    } catch (err) {
      setMessageState(
        createMessage('error', err.message || 'Không thể cập nhật avatar.')
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!canManageAvatar || !currentUser?.avatarUrl || avatarSaving) {
      return;
    }

    try {
      setAvatarSaving(true);
      setMessageState(null);

      const res = await authFetch(apiPath('auth/me/avatar'), {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Không thể xóa avatar.');
      }

      const nextUser = data.user || { ...currentUser, avatarUrl: null };
      setProfile(nextUser);
      syncStoredProfile(nextUser);
      setMessageState(
        createMessage('success', data.message || 'Xóa avatar thành công.')
      );
    } catch (err) {
      setMessageState(
        createMessage('error', err.message || 'Không thể xóa avatar.')
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRequestEmailVerification = async () => {
    if (!canVerifyEmail) {
      return;
    }

    if (!hasEmail) {
      setMessageState(createMessage('error', 'Vui lòng cập nhật email trước khi xác thực.'));
      return;
    }

    if (emailDirty) {
      setMessageState(createMessage('error', 'Hãy lưu email mới trước khi yêu cầu mã xác thực.'));
      return;
    }

    try {
      setVerificationSending(true);
      setMessageState(null);

      const res = await authFetch(apiPath('auth/me/email-verification/request'), {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi mã xác thực email.');
      }

      const devHint = data.testOtp ? ` Mã thử nghiệm: ${data.testOtp}.` : '';
      setMessageState(
        createMessage(
          'success',
          `${data.message || 'Mã xác thực email đã được gửi.'}${devHint}`
        )
      );
    } catch (err) {
      setMessageState(
        createMessage('error', err.message || 'Không thể gửi mã xác thực email.')
      );
    } finally {
      setVerificationSending(false);
    }
  };

  const handleConfirmEmailVerification = async (event) => {
    event.preventDefault();

    if (!canVerifyEmail) {
      return;
    }

    if (!String(verificationForm.code || '').trim()) {
      setMessageState(createMessage('error', 'Vui lòng nhập mã xác thực đã nhận qua email.'));
      return;
    }

    try {
      setVerificationConfirming(true);
      setMessageState(null);

      const res = await authFetch(apiPath('auth/me/email-verification/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationForm.code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Không thể xác thực email.');
      }

      const nextUser = data.user || currentUser;
      setProfile(nextUser);
      setVerificationForm(emptyVerificationForm);
      syncStoredProfile(nextUser);
      setMessageState(
        createMessage('success', data.message || 'Email đã được xác thực thành công.')
      );
    } catch (err) {
      setMessageState(
        createMessage('error', err.message || 'Không thể xác thực email.')
      );
    } finally {
      setVerificationConfirming(false);
    }
  };

  const renderInfoPanel = () => {
    if (loading) {
      return (
        <div className="userProfilePage__loadingState" aria-hidden="true">
          <div className="userProfilePage__skeleton userProfilePage__skeleton--wide" />
          <div className="userProfilePage__skeletonGrid">
            <div className="userProfilePage__skeleton" />
            <div className="userProfilePage__skeleton" />
            <div className="userProfilePage__skeleton" />
            <div className="userProfilePage__skeleton userProfilePage__skeleton--tall" />
          </div>
        </div>
      );
    }

    return (
      <form className="userProfilePage__form" onSubmit={handleSaveProfile}>
        {isAdminReviewMode ? (
          <div className="userProfilePage__readonlyBanner">
            <strong>Admin review mode</strong>
            <span>Trang này đang hiển thị hồ sơ đầy đủ của người dùng ở chế độ chỉ xem.</span>
          </div>
        ) : null}

        <div className="userProfilePage__formGrid">
          <label className="userProfilePage__field">
            <span className="userProfilePage__fieldLabel">User name</span>
            <input
              type="text"
              name="name"
              value={profileForm.name}
              onChange={handleProfileFieldChange}
              className="userProfilePage__input"
              placeholder="Nhập tên hiển thị"
              disabled={!canEditProfile}
            />
          </label>

          <label className="userProfilePage__field">
            <span className="userProfilePage__fieldLabel">Email</span>
            <input
              type="email"
              name="email"
              value={profileForm.email}
              onChange={handleProfileFieldChange}
              className="userProfilePage__input"
              placeholder="teacher@example.com"
              disabled={!canEditProfile}
            />
          </label>

          <label className="userProfilePage__field">
            <span className="userProfilePage__fieldLabel">Số điện thoại</span>
            <input
              type="text"
              value={currentUser?.phone || ''}
              disabled
              className="userProfilePage__input userProfilePage__input--locked"
            />
            <span className="userProfilePage__fieldHint">
              Trường này đang khóa theo yêu cầu để tránh thay đổi mã định danh tài khoản.
            </span>
          </label>

          <label className="userProfilePage__field">
            <span className="userProfilePage__fieldLabel">Địa chỉ</span>
            <input
              type="text"
              name="address"
              value={profileForm.address}
              onChange={handleProfileFieldChange}
              className="userProfilePage__input"
              placeholder="Ví dụ: Hai Bà Trưng, Hà Nội"
              disabled={!canEditProfile}
            />
          </label>
        </div>

        <label className="userProfilePage__field userProfilePage__field--full">
          <span className="userProfilePage__fieldLabel">Giới thiệu bản thân</span>
          <textarea
            name="bio"
            value={profileForm.bio}
            onChange={handleProfileFieldChange}
            className="userProfilePage__textarea"
            rows="5"
            maxLength="1200"
            placeholder="Giới thiệu ngắn gọn về chuyên môn, lớp đang phụ trách hoặc phong cách giảng dạy của bạn."
            disabled={!canEditProfile}
          />
          <span className="userProfilePage__fieldHint userProfilePage__fieldHint--split">
            <span>Nên giữ trong 2-4 câu ngắn, rõ chuyên môn và khu vực phụ trách.</span>
            <span>{bioCount}/1200</span>
          </span>
        </label>

        {canEditProfile ? (
          <div className="userProfilePage__actions">
            <button
              type="submit"
              className="userProfilePage__button userProfilePage__button--primary"
              disabled={profileSaving}
            >
              {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button
              type="button"
              className="userProfilePage__button userProfilePage__button--ghost"
              disabled={profileSaving || !profileChanged}
              onClick={() => setProfileForm(mapUserToProfileForm(profile))}
            >
              Hoàn tác
            </button>
          </div>
        ) : null}
      </form>
    );
  };

  const renderSecurityPanel = () => (
    <div className="userProfilePage__securityStack">
      <section className="userProfilePage__securityCard">
        <div className="userProfilePage__cardHeader userProfilePage__cardHeader--tight">
          <div>
            <div className="userProfilePage__cardEyebrow">Xác thực email</div>
            <h2 className="userProfilePage__cardTitle">Trạng thái email đăng nhập</h2>
          </div>
          <span className={`userProfilePage__statusBadge userProfilePage__statusBadge--${emailVerificationTone}`}>
            {emailVerificationLabel}
          </span>
        </div>

        <p className="userProfilePage__bodyCopy">
          {hasEmail
            ? isEmailVerified
              ? 'Email hiện tại đã được xác thực. Bạn có thể dùng email này cho thông báo và khôi phục tài khoản.'
              : 'Xác thực email để hồ sơ đáng tin cậy hơn và sẵn sàng cho các luồng thông báo sau này.'
            : 'Hiện chưa có email trên hồ sơ. Hãy thêm email ở tab Thông tin trước khi xác thực.'}
        </p>

        {isAdminReviewMode ? (
          <div className="userProfilePage__readonlyBanner userProfilePage__readonlyBanner--subtle">
            <strong>Chỉ xem</strong>
            <span>Admin có thể theo dõi trạng thái xác thực email tại đây, nhưng không gửi mã thay cho người dùng.</span>
          </div>
        ) : !hasEmail ? (
          <button
            type="button"
            className="userProfilePage__button userProfilePage__button--ghost"
            onClick={() => setActiveTab('info')}
          >
            Đi tới tab Thông tin
          </button>
        ) : isEmailVerified ? null : (
          <>
            {emailDirty ? (
              <div className="userProfilePage__readonlyBanner userProfilePage__readonlyBanner--subtle">
                <strong>Email mới chưa được lưu</strong>
                <span>Hãy lưu tab Thông tin trước, sau đó gửi mã xác thực cho email mới.</span>
              </div>
            ) : null}

            <div className="userProfilePage__inlineActions">
              <button
                type="button"
                className="userProfilePage__button userProfilePage__button--primary"
                onClick={handleRequestEmailVerification}
                disabled={verificationSending || emailDirty}
              >
                {verificationSending ? 'Đang gửi...' : 'Gửi mã xác thực'}
              </button>
            </div>

            <form className="userProfilePage__form" onSubmit={handleConfirmEmailVerification}>
              <label className="userProfilePage__field userProfilePage__field--full">
                <span className="userProfilePage__fieldLabel">Mã xác thực</span>
                <div className="userProfilePage__verificationCodeRow">
                  <input
                    type="text"
                    name="code"
                    value={verificationForm.code}
                    onChange={handleVerificationFieldChange}
                    className="userProfilePage__input"
                    placeholder="Nhập 6 chữ số"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <button
                    type="submit"
                    className="userProfilePage__button userProfilePage__button--ghost"
                    disabled={verificationConfirming}
                  >
                    {verificationConfirming ? 'Đang kiểm tra...' : 'Xác nhận email'}
                  </button>
                </div>
              </label>
            </form>
          </>
        )}
      </section>

      <section className="userProfilePage__securityCard">
        <div className="userProfilePage__cardHeader userProfilePage__cardHeader--tight">
          <div>
            <div className="userProfilePage__cardEyebrow">Mật khẩu</div>
            <h2 className="userProfilePage__cardTitle">Đổi mật khẩu</h2>
          </div>
        </div>

        {canChangePassword ? (
          <form className="userProfilePage__form" onSubmit={handleChangePassword}>
            <label className="userProfilePage__field">
              <span className="userProfilePage__fieldLabel">Mật khẩu hiện tại</span>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordFieldChange}
                className="userProfilePage__input"
                placeholder="Nhập mật khẩu hiện tại"
              />
            </label>

            <label className="userProfilePage__field">
              <span className="userProfilePage__fieldLabel">Mật khẩu mới</span>
              <input
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordFieldChange}
                className="userProfilePage__input"
                placeholder="Tối thiểu 6 ký tự"
              />
            </label>

            <label className="userProfilePage__field">
              <span className="userProfilePage__fieldLabel">Xác nhận mật khẩu mới</span>
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordFieldChange}
                className="userProfilePage__input"
                placeholder="Nhập lại mật khẩu mới"
              />
            </label>

            <button
              type="submit"
              className="userProfilePage__button userProfilePage__button--primary userProfilePage__button--full"
              disabled={passwordSaving}
            >
              {passwordSaving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
          </form>
        ) : (
          <div className="userProfilePage__readonlyBanner userProfilePage__readonlyBanner--subtle">
            <strong>Không chỉnh sửa tại đây</strong>
            <span>Để tránh thao tác nhầm trên tài khoản khác, phần đổi mật khẩu chỉ khả dụng với chính chủ.</span>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="userProfilePage">
      {isTeacherShell ? <AdminNavbar /> : null}

      <main
        className={`userProfilePage__shell${
          isTeacherShell ? ' userProfilePage__shell--withNavbar' : ''
        }`}
      >
        <div className={`userProfilePage__workspace${isTeacherShell ? ' userProfilePage__workspace--withNavbar' : ''}`}>
          <aside className="userProfilePage__heroSidebar">
            <section className="userProfilePage__hero">
              <div className="userProfilePage__heroCard">
                <div className="userProfilePage__heroMain">
                  <div className="userProfilePage__avatarCluster">
                    <div className="userProfilePage__avatarFrame">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={currentUser?.name || 'User avatar'}
                          className="userProfilePage__avatarImage"
                        />
                      ) : (
                        <span className="userProfilePage__avatarFallback">
                          {initials}
                        </span>
                      )}
                    </div>

                    <div className="userProfilePage__avatarActions">
                      {canManageAvatar ? (
                        <>
                          <button
                            type="button"
                            className="userProfilePage__button userProfilePage__button--primary"
                            onClick={handlePickAvatar}
                            disabled={avatarSaving}
                          >
                            {avatarSaving
                              ? 'Đang xử lý...'
                              : currentUser?.avatarUrl
                              ? 'Đổi avatar'
                              : 'Tải avatar'}
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                            className="userProfilePage__fileInput"
                            onChange={handleAvatarChange}
                          />
                          <button
                            type="button"
                            className="userProfilePage__button userProfilePage__button--ghost"
                            onClick={handleRemoveAvatar}
                            disabled={!currentUser?.avatarUrl || avatarSaving}
                          >
                            Xóa avatar
                          </button>
                          <p className="userProfilePage__avatarHint">
                            Crop trước khi upload. PNG, JPG, WebP tối đa 3MB.
                          </p>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="userProfilePage__button userProfilePage__button--ghost"
                            onClick={() => navigate('/admin/users')}
                          >
                            Quay lại quản lý user
                          </button>
                          <p className="userProfilePage__avatarHint">
                            Xem nhanh hồ sơ và trạng thái xác thực.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="userProfilePage__heroText">
                    <span className="userProfilePage__eyebrow">
                      {isAdminReviewMode ? 'Admin profile review' : 'Teacher account profile'}
                    </span>
                    <h1 className="userProfilePage__title">
                      {currentUser?.name || 'Hồ sơ người dùng'}
                    </h1>
                    <p className="userProfilePage__subtitle">
                      {isAdminReviewMode
                        ? 'Xem nhanh dữ liệu chính của người dùng.'
                        : 'Cập nhật nhanh hồ sơ và bảo mật tài khoản.'}
                    </p>

                    <div className="userProfilePage__chipRow">
                      <span className="userProfilePage__chip">{roleLabel}</span>
                      <span className="userProfilePage__chip">Số điện thoại khóa chỉnh sửa</span>
                      <span className={`userProfilePage__chip userProfilePage__chip--${emailVerificationTone}`}>
                        {emailVerificationLabel}
                      </span>
                      <span className="userProfilePage__chip">
                        Tham gia {formatMemberDate(currentUser?.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="userProfilePage__heroStats">
                  <div className="userProfilePage__heroStat">
                    <span className="userProfilePage__heroStatLabel">Liên hệ chính</span>
                    <strong className="userProfilePage__heroStatValue">
                      {currentUser?.phone || 'Chưa có số điện thoại'}
                    </strong>
                  </div>
                  <div className="userProfilePage__heroStat">
                    <span className="userProfilePage__heroStatLabel">Email</span>
                    <strong className="userProfilePage__heroStatValue">
                      {currentUser?.email || 'Chưa cập nhật email'}
                    </strong>
                  </div>
                  <div className="userProfilePage__heroStat">
                    <span className="userProfilePage__heroStatLabel">Mô tả nhanh</span>
                    <strong className="userProfilePage__heroStatValue">
                      {currentUser?.bio
                        ? `${String(currentUser.bio).trim().slice(0, 60)}${
                            String(currentUser.bio).trim().length > 60 ? '...' : ''
                          }`
                        : 'Chưa có giới thiệu'}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <section className="userProfilePage__content">
            {messageState ? (
              <div
                className={`userProfilePage__message userProfilePage__message--${messageState.type}`}
                aria-live="polite"
              >
                {messageState.message}
              </div>
            ) : null}

            <div className="userProfilePage__tabBar" role="tablist" aria-label="Profile sections">
              {profileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`userProfilePage__tab userProfilePage__tab--${tab.id}${activeTab === tab.id ? ' userProfilePage__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="userProfilePage__tabLabel">{tab.label}</span>
                  <span className="userProfilePage__tabMeta">{tab.description}</span>
                </button>
              ))}
            </div>

            <div className="userProfilePage__layout">
              <section className="userProfilePage__card userProfilePage__card--main">
                <div className="userProfilePage__cardHeader">
                  <div>
                    <div className="userProfilePage__cardEyebrow">
                      {activeTab === 'info' ? 'Thông tin cá nhân' : 'Bảo mật tài khoản'}
                    </div>
                    <h2 className="userProfilePage__cardTitle">
                      {activeTab === 'info' ? 'Hồ sơ người dùng' : 'Mật khẩu và xác thực email'}
                    </h2>
                  </div>
                  <div className="userProfilePage__cardMeta">
                    {activeTab === 'info'
                      ? 'Cập nhật tên hiển thị, email, địa chỉ và phần giới thiệu.'
                      : 'Giữ email được xác thực và mật khẩu đủ mạnh để tài khoản ổn định hơn.'}
                  </div>
                </div>

                {activeTab === 'info' ? renderInfoPanel() : renderSecurityPanel()}
              </section>

              <aside className="userProfilePage__stack">
                <section className="userProfilePage__card">
                  <div className="userProfilePage__cardHeader userProfilePage__cardHeader--tight">
                    <div>
                      <div className="userProfilePage__cardEyebrow">Tóm tắt hồ sơ</div>
                      <h2 className="userProfilePage__cardTitle">Thông tin nhanh</h2>
                    </div>
                  </div>

                  <div className="userProfilePage__summaryList">
                    <div className="userProfilePage__summaryItem">
                      <span className="userProfilePage__summaryLabel">Phone</span>
                      <strong className="userProfilePage__summaryValue">{currentUser?.phone || '—'}</strong>
                    </div>
                    <div className="userProfilePage__summaryItem">
                      <span className="userProfilePage__summaryLabel">Email</span>
                      <strong className="userProfilePage__summaryValue">{currentUser?.email || 'Chưa cập nhật'}</strong>
                    </div>
                    <div className="userProfilePage__summaryItem">
                      <span className="userProfilePage__summaryLabel">Email status</span>
                      <strong className="userProfilePage__summaryValue">{emailVerificationLabel}</strong>
                    </div>
                    <div className="userProfilePage__summaryItem">
                      <span className="userProfilePage__summaryLabel">Địa chỉ</span>
                      <strong className="userProfilePage__summaryValue">{currentUser?.address || 'Chưa cập nhật'}</strong>
                    </div>
                  </div>
                </section>

                <section className="userProfilePage__card">
                  <div className="userProfilePage__cardHeader userProfilePage__cardHeader--tight">
                    <div>
                      <div className="userProfilePage__cardEyebrow">Gợi ý thêm</div>
                      <h2 className="userProfilePage__cardTitle">
                        {isAdminReviewMode ? 'Ghi chú cho admin' : 'Để hồ sơ gọn và chuyên nghiệp hơn'}
                      </h2>
                    </div>
                  </div>

                  <ul className="userProfilePage__tipList">
                    {isAdminReviewMode ? (
                      <>
                        <li>Avatar, bio và địa chỉ hiện được lấy từ hồ sơ chi tiết thay vì dữ liệu rút gọn ở trang quản lý user.</li>
                        <li>Trạng thái xác thực email giúp admin biết nhanh tài khoản đã sẵn sàng cho các luồng thông báo qua email hay chưa.</li>
                        <li>Đổi mật khẩu cho user khác vẫn nên thực hiện ở trang quản lý user để tránh nhầm lẫn thao tác tự phục vụ.</li>
                      </>
                    ) : (
                      <>
                        <li>Avatar nên là ảnh chân dung sáng, nền đơn giản, crop sát khuôn mặt để khung tròn đẹp hơn.</li>
                        <li>Email nên dùng địa chỉ đang hoạt động để tiện khôi phục mật khẩu hoặc nhận thông báo nội bộ sau này.</li>
                        <li>Phần giới thiệu chỉ cần 2-3 ý chính: môn phụ trách, cấp độ đang dạy, và phong cách hỗ trợ học viên.</li>
                        <li>Giữ số điện thoại cố định giúp lịch sử bài nộp, phản hồi và thông báo không bị lệch tài khoản.</li>
                      </>
                    )}
                  </ul>
                </section>
              </aside>
            </div>
          </section>
        </div>

        {cropAsset ? (
          <div className="userProfilePage__dialogBackdrop" role="dialog" aria-modal="true" aria-label="Crop avatar before upload">
            <div className="userProfilePage__dialogCard">
              <div className="userProfilePage__cardHeader userProfilePage__cardHeader--tight">
                <div>
                  <div className="userProfilePage__cardEyebrow">Avatar crop</div>
                  <h2 className="userProfilePage__cardTitle">Căn chỉnh ảnh trước khi upload</h2>
                </div>
                <div className="userProfilePage__cardMeta">
                  Kéo ảnh và zoom nhẹ để khuôn mặt nằm đẹp trong khung tròn.
                </div>
              </div>

              <div className="userProfilePage__cropStage">
                <Cropper
                  image={cropAsset.src}
                  crop={cropPosition}
                  zoom={cropZoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCropPosition}
                  onZoomChange={setCropZoom}
                  onCropComplete={(_croppedArea, nextCroppedAreaPixels) => setCroppedAreaPixels(nextCroppedAreaPixels)}
                />
              </div>

              <div className="userProfilePage__zoomControl">
                <span className="userProfilePage__fieldLabel">Zoom ảnh</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  className="userProfilePage__range"
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                />
              </div>

              <div className="userProfilePage__actions">
                <button
                  type="button"
                  className="userProfilePage__button userProfilePage__button--ghost"
                  onClick={closeCropModal}
                  disabled={avatarSaving}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="userProfilePage__button userProfilePage__button--primary"
                  onClick={handleApplyAvatarCrop}
                  disabled={avatarSaving}
                >
                  {avatarSaving ? 'Đang upload...' : 'Crop và lưu avatar'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default UserProfilePage;